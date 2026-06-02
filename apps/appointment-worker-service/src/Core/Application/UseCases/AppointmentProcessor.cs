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

    public AppointmentProcessor(
        IAppointmentRepository appointmentRepository,
        ICacheProvider cacheProvider,
        ILogger<AppointmentProcessor> logger,
        ITechnicianService technicianService = null!,
        IBayService bayService = null!,
        FluentValidation.IValidator<AppointmentMessage> validator = null!)
    {
        _appointmentRepository = appointmentRepository;
        _cacheProvider = cacheProvider;
        _logger = logger;
        _technicianService = technicianService;
        _bayService = bayService;
        _validator = validator;
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
        var endUtc = startUtc.AddHours(1);

        if (message.TechnicianId != null)
        {
            await _technicianService.ValidateAndCheckAvailabilityAsync(message.TechnicianId, message.ServiceTypeId, startUtc, endUtc, cancellationToken);
        }

        if (message.ServiceBayId != null)
        {
            await _bayService.ValidateAndCheckAvailabilityAsync(message.ServiceBayId, startUtc, endUtc, cancellationToken);
        }

        var record = new TrackingRecord
        {
            Id = Guid.NewGuid(),
            TenantId = message.TenantId,
            VehicleId = message.VehicleId,
            CustomerId = message.CustomerId,
            ServiceTypeId = message.ServiceTypeId,
            TechnicianId = message.TechnicianId,
            ServiceBayId = message.ServiceBayId,
            StartTime = startUtc,
            EndTime = endUtc,
            Status = AppointmentStatus.Scheduled
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
    }
}
