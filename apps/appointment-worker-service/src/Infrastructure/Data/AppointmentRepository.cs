using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AppointmentWorkerService.Infrastructure.Data;

public class AppointmentRepository : IAppointmentRepository
{
    private readonly AppDbContext _dbContext;

    public AppointmentRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<TrackingRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<TrackingRecord>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(TrackingRecord trackingRecord, CancellationToken cancellationToken = default)
    {
        await _dbContext.Set<TrackingRecord>().AddAsync(trackingRecord, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(TrackingRecord trackingRecord, CancellationToken cancellationToken = default)
    {
        _dbContext.Set<TrackingRecord>().Update(trackingRecord);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
