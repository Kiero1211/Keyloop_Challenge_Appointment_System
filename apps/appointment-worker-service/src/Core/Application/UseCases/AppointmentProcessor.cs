using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace AppointmentWorkerService.Core.Application.UseCases;

public class AppointmentProcessor : IAppointmentProcessor
{
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly ICacheProvider _cacheProvider;
    private readonly IBayAvailabilityService _bayAvailabilityService;
    private readonly ILogger<AppointmentProcessor> _logger;

    public AppointmentProcessor(
        IAppointmentRepository appointmentRepository,
        ICacheProvider cacheProvider,
        IBayAvailabilityService bayAvailabilityService,
        ILogger<AppointmentProcessor> logger)
    {
        _appointmentRepository = appointmentRepository;
        _cacheProvider = cacheProvider;
        _bayAvailabilityService = bayAvailabilityService;
        _logger = logger;
    }

    public async Task ProcessAsync(AppointmentMessage message, string messageId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing appointment message for tenant {TenantId}, vehicle {VehicleId}", message.TenantId, message.VehicleId);

        // End time is mocked for MVP, would normally be based on service type duration
        var endTime = message.DesiredStartTime.AddHours(1);

        var isAvailable = await _bayAvailabilityService.IsAvailableAsync(
            message.ServiceBayId ?? "default-bay", 
            message.TechnicianId ?? "default-tech", 
            message.DesiredStartTime, 
            endTime, 
            cancellationToken);

        var record = new TrackingRecord
        {
            Id = Guid.NewGuid(),
            TenantId = message.TenantId,
            VehicleId = message.VehicleId,
            CustomerId = message.CustomerId,
            ServiceTypeId = message.ServiceTypeId,
            StartTime = message.DesiredStartTime,
            EndTime = endTime,
            Status = isAvailable ? AppointmentStatus.Confirmed : AppointmentStatus.Rejected
        };

        try
        {
            await _appointmentRepository.AddAsync(record, cancellationToken);
            _logger.LogInformation("Successfully saved appointment {Id} with status {Status}", record.Id, record.Status);
            
            // Push status to Redis
            await _cacheProvider.SetAsync($"appointment:{record.Id}", record, TimeSpan.FromHours(24));
            
            // Mark as acknowledged in stream
            await _cacheProvider.StreamAcknowledgeAsync("appointments_stream", "worker_group", messageId);
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex, "Concurrency conflict detected for appointment {Id}", record.Id);
            record.Status = AppointmentStatus.Rejected;
            
            // Update cache with rejected status
            await _cacheProvider.SetAsync($"appointment:{record.Id}", record, TimeSpan.FromHours(24));
            
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
