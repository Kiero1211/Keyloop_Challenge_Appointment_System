namespace AppointmentWorkerService.Core.Application.Ports.Services;

public interface IBayService
{
    Task ValidateAndCheckAvailabilityAsync(
        string serviceBayId,
        DateTimeOffset startUtc,
        DateTimeOffset endUtc,
        CancellationToken ct = default);
}
