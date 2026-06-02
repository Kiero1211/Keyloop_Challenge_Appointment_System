namespace AppointmentWorkerService.Core.Application.Ports.Repositories;

public interface IServiceBayRepository
{
    Task<bool> ExistsAsync(string serviceBayId, CancellationToken ct = default);
    Task<List<string>> GetAllBaysAsync(CancellationToken ct = default);
}
