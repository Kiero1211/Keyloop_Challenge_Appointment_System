namespace AppointmentWorkerService.Core.Application.Ports;

public interface IBayAvailabilityService
{
    Task<bool> IsAvailableAsync(string serviceBayId, string technicianId, DateTimeOffset startTime, DateTimeOffset endTime, CancellationToken cancellationToken = default);
}
