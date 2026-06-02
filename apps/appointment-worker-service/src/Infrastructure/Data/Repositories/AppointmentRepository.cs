using AppointmentWorkerService.Core.Application.Ports.Repositories;
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

    public async Task<bool> HasTechnicianOverlapAsync(string technicianId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct = default)
    {
        return await _dbContext.Set<TrackingRecord>()
            .AnyAsync(a => a.TechnicianId == technicianId &&
                           (a.Status == AppointmentStatus.Scheduled || a.Status == AppointmentStatus.InProgress) &&
                           a.StartTime < endUtc &&
                           a.EndTime > startUtc, ct);
    }

    public async Task<bool> HasBayOverlapAsync(string serviceBayId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct = default)
    {
        return await _dbContext.Set<TrackingRecord>()
            .AnyAsync(a => a.ServiceBayId == serviceBayId &&
                           (a.Status == AppointmentStatus.Scheduled || a.Status == AppointmentStatus.InProgress) &&
                           a.StartTime < endUtc &&
                           a.EndTime > startUtc, ct);
    }
}
