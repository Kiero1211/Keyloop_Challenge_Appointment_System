namespace AppointmentWorkerService.Core.Application.Ports.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body, CancellationToken cancellationToken = default);
}
