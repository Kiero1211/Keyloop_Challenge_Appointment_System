using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Domain.Exceptions;
using Microsoft.Extensions.Logging;

namespace AppointmentWorkerService.Core.Application.UseCases;

public class AppointmentProcessor : IAppointmentProcessor
{
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly ICacheProvider _cacheProvider;
    private readonly ILogger<AppointmentProcessor> _logger;

    private readonly ITechnicianService _technicianService;
    private readonly IBayService _bayService;
    private readonly FluentValidation.IValidator<AppointmentMessage> _validator;
    
    private readonly ITechnicianRepository _technicianRepository;
    private readonly IServiceBayRepository _bayRepository;
    private readonly IDistributedLock _distributedLock;

    public AppointmentProcessor(
        IAppointmentRepository appointmentRepository,
        ICacheProvider cacheProvider,
        ILogger<AppointmentProcessor> logger,
        ITechnicianService technicianService = null!,
        IBayService bayService = null!,
        FluentValidation.IValidator<AppointmentMessage> validator = null!,
        ITechnicianRepository technicianRepository = null!,
        IServiceBayRepository bayRepository = null!,
        IDistributedLock distributedLock = null!)
    {
        _appointmentRepository = appointmentRepository;
        _cacheProvider = cacheProvider;
        _logger = logger;
        _technicianService = technicianService;
        _bayService = bayService;
        _validator = validator;
        _technicianRepository = technicianRepository;
        _bayRepository = bayRepository;
        _distributedLock = distributedLock;
    }

    public async Task ProcessAsync(AppointmentMessage message, string messageId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing appointment message for tenant {TenantId}, vehicle {VehicleId}", message.TenantId, message.VehicleId);

        var validationResult = await _validator.ValidateAsync(message, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new InvalidBookingRequestException($"Validation failed: {string.Join(", ", validationResult.Errors)}");
        }

        var startUtc = message.DesiredStartTime.ToUniversalTime();
        var endUtc = message.ScheduledEndTime?.ToUniversalTime() ?? startUtc.AddHours(1);

        string? assignedTechId = message.TechnicianId;
        string? assignedBayId = message.ServiceBayId;
        
        var techLock = string.Empty;
        var bayLock = string.Empty;

        if (message.AutoAssigned)
        {
            var techIds = await _technicianRepository.GetTechniciansBySkillAsync(message.ServiceTypeId, cancellationToken);
            var bayIds = await _bayRepository.GetAllBaysAsync(cancellationToken);

            foreach (var techId in techIds)
            {
                var hasOverlap = await _appointmentRepository.HasTechnicianOverlapAsync(techId, startUtc, endUtc, cancellationToken);
                if (hasOverlap) continue;

                foreach (var bayId in bayIds)
                {
                    var bayOverlap = await _appointmentRepository.HasBayOverlapAsync(bayId, startUtc, endUtc, cancellationToken);
                    if (bayOverlap) continue;

                    techLock = $"tenant:{message.TenantId}:lock:tech:{techId}:{startUtc.Ticks}";
                    bayLock = $"tenant:{message.TenantId}:lock:bay:{bayId}:{startUtc.Ticks}";

                    var techLocked = await _distributedLock.AcquireLockAsync(techLock, messageId, TimeSpan.FromSeconds(30));
                    if (!techLocked) continue;

                    var bayLocked = await _distributedLock.AcquireLockAsync(bayLock, messageId, TimeSpan.FromSeconds(30));
                    if (!bayLocked)
                    {
                        await _distributedLock.ReleaseLockAsync(techLock, messageId);
                        continue;
                    }

                    // Re-check overlap after acquiring lock
                    hasOverlap = await _appointmentRepository.HasTechnicianOverlapAsync(techId, startUtc, endUtc, cancellationToken);
                    bayOverlap = await _appointmentRepository.HasBayOverlapAsync(bayId, startUtc, endUtc, cancellationToken);

                    if (hasOverlap || bayOverlap)
                    {
                        await _distributedLock.ReleaseLockAsync(techLock, messageId);
                        await _distributedLock.ReleaseLockAsync(bayLock, messageId);
                        continue;
                    }

                    assignedTechId = techId;
                    assignedBayId = bayId;
                    break;
                }
                if (assignedTechId != null) break;
            }

            if (assignedTechId == null || assignedBayId == null)
            {
                // Task T011 will route this to DLQ, for now throw exception to cause retry/failure
                throw new ResourceCurrentlyOccupiedException("AutoAssignment", startUtc, endUtc);
            }
        }
        else
        {
            if (message.TechnicianId != null && message.ServiceBayId != null)
            {
                techLock = $"tenant:{message.TenantId}:lock:tech:{message.TechnicianId}:{startUtc.Ticks}";
                bayLock = $"tenant:{message.TenantId}:lock:bay:{message.ServiceBayId}:{startUtc.Ticks}";

                var techLocked = await _distributedLock.AcquireLockAsync(techLock, messageId, TimeSpan.FromSeconds(30));
                if (!techLocked) throw new ResourceCurrentlyOccupiedException("Technician", startUtc, endUtc);

                var bayLocked = await _distributedLock.AcquireLockAsync(bayLock, messageId, TimeSpan.FromSeconds(30));
                if (!bayLocked)
                {
                    await _distributedLock.ReleaseLockAsync(techLock, messageId);
                    throw new ResourceCurrentlyOccupiedException("ServiceBay", startUtc, endUtc);
                }
            }

            if (message.TechnicianId != null)
            {
                await _technicianService.ValidateAndCheckAvailabilityAsync(message.TechnicianId, message.ServiceTypeId, startUtc, endUtc, cancellationToken);
            }

            if (message.ServiceBayId != null)
            {
                await _bayService.ValidateAndCheckAvailabilityAsync(message.ServiceBayId, startUtc, endUtc, cancellationToken);
            }
        }

        var record = new TrackingRecord
        {
            Id = Guid.NewGuid(),
            TenantId = message.TenantId,
            VehicleId = message.VehicleId,
            CustomerId = message.CustomerId,
            ServiceTypeId = message.ServiceTypeId,
            TechnicianId = assignedTechId!,
            ServiceBayId = assignedBayId!,
            StartTime = startUtc,
            EndTime = endUtc,
            Status = AppointmentStatus.Scheduled,
            AutoAssigned = message.AutoAssigned
        };

        try
        {
            await _appointmentRepository.AddAsync(record, cancellationToken);
            _logger.LogInformation("Successfully saved appointment {Id} with status {Status}", record.Id, record.Status);
            
            // Push status to Redis (No TTL for Scheduled)
            await _cacheProvider.SetAsync($"{record.TenantId}:AppointmentDetail:{record.Id}", new { appointment = record }, null);
            
            // Mark as acknowledged in stream
            await _cacheProvider.StreamAcknowledgeAsync("appointments_stream", "worker_group", messageId);
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex, "Concurrency conflict detected for appointment {Id}", record.Id);
            record.Status = AppointmentStatus.Cancelled;
            
            // Update cache with rejected status (6 hours TTL for Cancelled)
            await _cacheProvider.SetAsync($"{record.TenantId}:AppointmentDetail:{record.Id}", new { appointment = record }, TimeSpan.FromHours(6));
            
            // Acknowledge stream message to avoid infinite retry loop
            await _cacheProvider.StreamAcknowledgeAsync("appointments_stream", "worker_group", messageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process appointment message {MessageId}", messageId);
            throw;
        }
        finally
        {
            if (assignedTechId != null && assignedBayId != null)
            {
                await _distributedLock.ReleaseLockAsync(techLock, messageId);
                await _distributedLock.ReleaseLockAsync(bayLock, messageId);
            }
        }
    }
}
