namespace AppointmentWorkerService.Core.Domain.Entities;

public record AppointmentMessage(
    string TenantId,
    string VehicleId,
    string CustomerId,
    string ServiceTypeId,
    string? ServiceBayId,
    string? TechnicianId,
    DateTimeOffset DesiredStartTime,
    string Source,
    bool AutoAssigned,
    DateTimeOffset? ScheduledEndTime = null);
