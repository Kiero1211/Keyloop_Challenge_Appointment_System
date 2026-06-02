namespace AppointmentWorkerService.Core.Domain.Entities;

public class AppointmentReminder : IMustHaveTenant
{
    public Guid Id { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public Guid AppointmentId { get; set; }
    public DateTimeOffset SentAt { get; set; }
}
