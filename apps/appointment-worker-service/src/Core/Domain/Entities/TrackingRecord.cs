namespace AppointmentWorkerService.Core.Domain.Entities;

public enum AppointmentStatus
{
    Scheduled,
    InProgress,
    Cancelled,
    Completed,
    Failed
}

public class TrackingRecord : IMustHaveTenant
{
    public Guid Id { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public string VehicleId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ServiceTypeId { get; set; } = string.Empty;
    public string ServiceBayId { get; set; } = string.Empty;
    public string TechnicianId { get; set; } = string.Empty;
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    public uint Version { get; set; }
}
