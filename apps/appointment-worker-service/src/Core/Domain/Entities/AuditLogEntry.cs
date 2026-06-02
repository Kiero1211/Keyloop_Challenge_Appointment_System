namespace AppointmentWorkerService.Core.Domain.Entities;

public class AuditLogEntry : IMustHaveTenant
{
    public Guid Id { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; }
    public string? UserId { get; set; }
}
