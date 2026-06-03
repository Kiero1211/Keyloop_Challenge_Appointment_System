namespace AppointmentWorkerService.Core.Domain.Entities;

public class AppointmentReminderData : IMustHaveTenant
{
    public string TenantId { get; set; } = string.Empty;
    public string AppointmentId { get; set; } = string.Empty;
    public DateTimeOffset AppointmentStartTime { get; set; }
    public AppointmentStatus AppointmentStatus { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string VehicleId { get; set; } = string.Empty;
    public string VehicleMake { get; set; } = string.Empty;
    public string VehicleModel { get; set; } = string.Empty;
    public bool ReminderSent { get; set; }
}
