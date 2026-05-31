using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace AppointmentWorkerService.Infrastructure.Data;

public class ServiceBayRepository : IServiceBayRepository
{
    private readonly AppDbContext _dbContext;

    public ServiceBayRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> ExistsAsync(string serviceBayId, CancellationToken ct = default)
    {
        return await _dbContext.ServiceBays.AnyAsync(b => b.Id == serviceBayId, ct);
    }
}
