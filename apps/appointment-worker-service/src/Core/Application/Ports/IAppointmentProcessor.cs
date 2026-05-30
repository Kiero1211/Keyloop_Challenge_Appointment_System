using AppointmentWorkerService.Core.Domain.Entities;

namespace AppointmentWorkerService.Core.Application.Ports;

public interface IAppointmentProcessor
{
    Task ProcessAsync(AppointmentMessage message, string messageId, CancellationToken cancellationToken = default);
}
