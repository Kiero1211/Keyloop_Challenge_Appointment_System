using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace AppointmentWorkerService.Infrastructure.Data;

public class TechnicianRepository : ITechnicianRepository
{
    private readonly AppDbContext _dbContext;

    public TechnicianRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> ExistsAsync(string technicianId, CancellationToken ct = default)
    {
        return await _dbContext.Technicians.AnyAsync(t => t.Id == technicianId, ct);
    }
}
