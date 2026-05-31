using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace AppointmentWorkerService.Infrastructure.Data;

public class TechnicianSkillRepository : ITechnicianSkillRepository
{
    private readonly AppDbContext _dbContext;

    public TechnicianSkillRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> HasSkillAsync(string technicianId, string serviceTypeId, CancellationToken ct = default)
    {
        return await _dbContext.TechnicianSkills.AnyAsync(ts => ts.TechnicianId == technicianId && ts.ServiceTypeId == serviceTypeId, ct);
    }
}
