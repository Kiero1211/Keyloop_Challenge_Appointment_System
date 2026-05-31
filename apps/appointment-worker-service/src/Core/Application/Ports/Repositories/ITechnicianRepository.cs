namespace AppointmentWorkerService.Core.Application.Ports.Repositories;

public interface ITechnicianRepository
{
    Task<bool> ExistsAsync(string technicianId, CancellationToken ct = default);
}
