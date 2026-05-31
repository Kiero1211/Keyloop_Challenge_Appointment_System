namespace AppointmentWorkerService.Core.Application.Ports.Services;

public interface ITechnicianService
{
    Task ValidateAndCheckAvailabilityAsync(
        string technicianId,
        string serviceTypeId,
        DateTimeOffset startUtc,
        DateTimeOffset endUtc,
        CancellationToken ct = default);
}
