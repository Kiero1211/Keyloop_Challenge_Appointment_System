namespace AppointmentWorkerService.Core.Domain.Entities;

public class AppointmentReminder : IMustHaveTenant
{
    public string Id { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public string AppointmentId { get; set; } = string.Empty;
    public DateTimeOffset SentAt { get; set; }
}
