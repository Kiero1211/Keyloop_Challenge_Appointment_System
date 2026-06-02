namespace AppointmentWorkerService.Core.Application.Ports.Repositories;

public interface ITechnicianRepository
{
    Task<bool> ExistsAsync(string technicianId, CancellationToken ct = default);
    Task<List<string>> GetTechniciansBySkillAsync(string serviceTypeId, CancellationToken ct = default);
}
