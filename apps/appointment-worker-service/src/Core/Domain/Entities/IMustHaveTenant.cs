namespace AppointmentWorkerService.Core.Domain.Entities;

public interface IMustHaveTenant
{
    string TenantId { get; set; }
}
