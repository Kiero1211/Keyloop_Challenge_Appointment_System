namespace AppointmentWorkerService.Core.Application.Ports.Repositories;

public interface ITechnicianSkillRepository
{
    Task<bool> HasSkillAsync(string technicianId, string serviceTypeId, CancellationToken ct = default);
}
