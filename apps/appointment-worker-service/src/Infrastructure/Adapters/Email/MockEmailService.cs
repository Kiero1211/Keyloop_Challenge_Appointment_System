using Microsoft.Extensions.Logging;
using AppointmentWorkerService.Core.Application.Ports.Services;

namespace AppointmentWorkerService.Infrastructure.Adapters.Email;

public class MockEmailService : IEmailService
{
    private readonly ILogger<MockEmailService> _logger;

    public MockEmailService(ILogger<MockEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string body, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Sending mock email to {To} with subject '{Subject}'", to, subject);
        return Task.CompletedTask;
    }
}
