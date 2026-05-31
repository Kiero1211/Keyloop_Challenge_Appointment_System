namespace AppointmentWorkerService.Core.Domain.Entities;

public class TechnicianSkill : IMustHaveTenant
{
    public string Id { get; set; } = string.Empty;
    public string TechnicianId { get; set; } = string.Empty;
    public string ServiceTypeId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
}
