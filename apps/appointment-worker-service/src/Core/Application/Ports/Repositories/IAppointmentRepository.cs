using AppointmentWorkerService.Core.Domain.Entities;

namespace AppointmentWorkerService.Core.Application.Ports.Repositories;

public interface IAppointmentRepository
{
    Task<TrackingRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(TrackingRecord trackingRecord, CancellationToken cancellationToken = default);
    Task UpdateAsync(TrackingRecord trackingRecord, CancellationToken cancellationToken = default);
    Task<bool> HasTechnicianOverlapAsync(string technicianId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct = default);
    Task<bool> HasBayOverlapAsync(string serviceBayId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct = default);
}
