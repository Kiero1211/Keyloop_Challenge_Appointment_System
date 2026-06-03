using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Domain;
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

        var appointmentId = string.IsNullOrWhiteSpace(message.AppointmentId) ? messageId : message.AppointmentId;
        var appointmentKey = CacheKeys.AppointmentHashKey(message.TenantId, appointmentId);
        var activeAppointmentsKey = CacheKeys.ActiveAppointmentsSetKey(message.TenantId);
        string? assignedTechId = message.TechnicianId;
        string? assignedBayId = message.ServiceBayId;
        var techLock = string.Empty;
        var bayLock = string.Empty;

        try
        {
            var validationResult = await _validator.ValidateAsync(message, cancellationToken);
            if (!validationResult.IsValid)
            {
                throw new InvalidBookingRequestException($"Validation failed: {string.Join(", ", validationResult.Errors)}");
            }

            var startUtc = message.DesiredStartTime.ToUniversalTime();
            var endUtc = message.ScheduledEndTime?.ToUniversalTime() ?? startUtc.AddHours(1);

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
                    if (assignedTechId != null && assignedBayId != null && message.TechnicianId == null && message.ServiceBayId == null) break;
                    if (assignedTechId != null && message.TechnicianId == null) break;
                }

                if (assignedTechId == null || assignedBayId == null)
                {
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

            var recordId = Guid.TryParse(appointmentId, out var parsedAppointmentId) ? parsedAppointmentId : Guid.NewGuid();
            var record = new TrackingRecord
            {
                Id = recordId,
                TenantId = message.TenantId,
                VehicleId = message.VehicleId,
                UserId = message.UserId,
                ServiceTypeId = message.ServiceTypeId,
                TechnicianId = assignedTechId!,
                ServiceBayId = assignedBayId!,
                StartTime = startUtc,
                EndTime = endUtc,
                Status = AppointmentStatus.Scheduled
            };

            await _appointmentRepository.AddAsync(record, cancellationToken);
            _logger.LogInformation("Successfully saved appointment {Id} with status {Status}", record.Id, record.Status);

            var utcNow = DateTimeOffset.UtcNow.ToString("O");
            var scheduledFields = new Dictionary<string, string>
            {
                ["id"] = appointmentId,
                ["tenant_id"] = message.TenantId,
                ["user_id"] = message.UserId,
                ["vehicle_id"] = message.VehicleId,
                ["service_type_id"] = message.ServiceTypeId,
                ["technician_id"] = assignedTechId ?? string.Empty,
                ["service_bay_id"] = assignedBayId ?? string.Empty,
                ["start_time"] = startUtc.ToString("O"),
                ["end_time"] = endUtc.ToString("O"),
                ["status"] = "Scheduled",
                ["notes"] = string.Empty,
                ["actual_start_time"] = string.Empty,
                ["actual_end_time"] = string.Empty,
                ["created_at"] = utcNow,
                ["updated_at"] = utcNow
            };

            await _cacheProvider.HashSetFieldsAsync(appointmentKey, scheduledFields);
            await _cacheProvider.SetAddAsync(activeAppointmentsKey, appointmentId);

            if (!string.IsNullOrWhiteSpace(assignedTechId))
            {
                await _cacheProvider.SortedSetAddAsync(
                    CacheKeys.TechnicianOccupiedKey(message.TenantId, assignedTechId),
                    appointmentId,
                    startUtc.ToUnixTimeSeconds());
            }

            if (!string.IsNullOrWhiteSpace(assignedBayId))
            {
                await _cacheProvider.SortedSetAddAsync(
                    CacheKeys.BayOccupiedKey(message.TenantId, assignedBayId),
                    appointmentId,
                    startUtc.ToUnixTimeSeconds());
            }

            await _cacheProvider.HashSetFieldsAsync(
                CacheKeys.OccupiedSlotHashKey(message.TenantId, appointmentId),
                new Dictionary<string, string>
                {
                    ["appointment_id"] = appointmentId,
                    ["start_time"] = startUtc.ToString("O"),
                    ["end_time"] = endUtc.ToString("O")
                });

            await _cacheProvider.StreamAcknowledgeAsync("appointments_stream", "worker_group", messageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process appointment message {MessageId}", messageId);

            var failureNotes = ex.Message;
            var failureTime = DateTimeOffset.UtcNow.ToString("O");
            var failedRecord = new TrackingRecord
            {
                Id = Guid.TryParse(appointmentId, out var parsedAppointmentId) ? parsedAppointmentId : Guid.NewGuid(),
                TenantId = message.TenantId,
                VehicleId = message.VehicleId,
                UserId = message.UserId,
                ServiceTypeId = message.ServiceTypeId,
                TechnicianId = assignedTechId ?? Guid.Empty.ToString(),
                ServiceBayId = assignedBayId ?? Guid.Empty.ToString(),
                StartTime = message.DesiredStartTime.ToUniversalTime(),
                EndTime = message.ScheduledEndTime?.ToUniversalTime() ?? message.DesiredStartTime.ToUniversalTime().AddHours(1),
                Status = AppointmentStatus.Failed,
            };

            try
            {
                await _appointmentRepository.AddAsync(failedRecord, cancellationToken);
            }
            catch (Exception dbEx)
            {
                _logger.LogError(dbEx, "Failed to save Failed appointment record {MessageId}", messageId);
            }

            try
            {
                await _cacheProvider.HashSetFieldsAsync(
                    appointmentKey,
                    new Dictionary<string, string>
                    {
                        ["id"] = appointmentId,
                        ["tenant_id"] = message.TenantId,
                        ["user_id"] = message.UserId,
                        ["vehicle_id"] = message.VehicleId,
                        ["service_type_id"] = message.ServiceTypeId,
                        ["technician_id"] = assignedTechId ?? string.Empty,
                        ["service_bay_id"] = assignedBayId ?? string.Empty,
                        ["start_time"] = failedRecord.StartTime.ToUniversalTime().ToString("O"),
                        ["end_time"] = failedRecord.EndTime.ToUniversalTime().ToString("O"),
                        ["status"] = "Failed",
                        ["notes"] = failureNotes,
                        ["actual_start_time"] = string.Empty,
                        ["actual_end_time"] = string.Empty,
                        ["created_at"] = failureTime,
                        ["updated_at"] = failureTime
                    },
                    TimeSpan.FromHours(1));
                await _cacheProvider.SetRemoveAsync(activeAppointmentsKey, appointmentId);
                await _cacheProvider.StreamAcknowledgeAsync("appointments_stream", "worker_group", messageId);
            }
            catch (Exception cacheEx)
            {
                _logger.LogError(cacheEx, "Failed to update failed appointment cache state {MessageId}", messageId);
            }
        }
        finally
        {
            if (!string.IsNullOrEmpty(techLock))
            {
                await _distributedLock.ReleaseLockAsync(techLock, messageId);
            }
            if (!string.IsNullOrEmpty(bayLock))
            {
                await _distributedLock.ReleaseLockAsync(bayLock, messageId);
            }
        }
    }
}
