using AppointmentWorkerService.Core.Domain.Entities;

namespace AppointmentWorkerService.Core.Application.Ports;

public interface IAppointmentRepository
{
    Task<TrackingRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(TrackingRecord trackingRecord, CancellationToken cancellationToken = default);
    Task UpdateAsync(TrackingRecord trackingRecord, CancellationToken cancellationToken = default);
}
