using AppointmentWorkerService.Core.Domain.Entities;

namespace AppointmentWorkerService.Core.Application.Ports.Repositories;

public interface IAuditLogRepository
{
    Task AddAsync(AuditLogEntry entry, CancellationToken cancellationToken = default);
}
