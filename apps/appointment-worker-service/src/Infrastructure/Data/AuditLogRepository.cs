using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Domain.Entities;

namespace AppointmentWorkerService.Infrastructure.Data;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _dbContext;

    public AuditLogRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(AuditLogEntry entry, CancellationToken cancellationToken = default)
    {
        await _dbContext.Set<AuditLogEntry>().AddAsync(entry, cancellationToken);
        // We DO NOT call SaveChangesAsync here because it will be called by the outer unit of work (e.g. AppointmentRepository or UseCase)
    }
}
