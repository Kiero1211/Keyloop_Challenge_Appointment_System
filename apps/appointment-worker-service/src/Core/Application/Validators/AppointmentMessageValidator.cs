using AppointmentWorkerService.Core.Domain.Entities;
using FluentValidation;

namespace AppointmentWorkerService.Core.Application.Validators;

public class AppointmentMessageValidator : AbstractValidator<AppointmentMessage>
{
    public AppointmentMessageValidator()
    {
        RuleFor(x => x.TenantId).NotEmpty().WithMessage("TenantId is required");
        RuleFor(x => x.VehicleId).NotEmpty().WithMessage("VehicleId is required");
        RuleFor(x => x.CustomerId).NotEmpty().WithMessage("CustomerId is required");
        RuleFor(x => x.ServiceTypeId).NotEmpty().WithMessage("ServiceTypeId is required");
        RuleFor(x => x.TechnicianId).NotEmpty().WithMessage("TechnicianId is required");
        RuleFor(x => x.ServiceBayId).NotEmpty().WithMessage("ServiceBayId is required");
        RuleFor(x => x.DesiredStartTime).GreaterThan(DateTimeOffset.UtcNow).WithMessage("DesiredStartTime must be in the future");
    }
}
