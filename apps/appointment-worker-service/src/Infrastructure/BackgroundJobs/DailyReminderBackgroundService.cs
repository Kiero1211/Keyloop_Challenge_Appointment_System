using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using AppointmentWorkerService.Core.Application.UseCases;

namespace AppointmentWorkerService.Infrastructure.BackgroundJobs;

public class DailyReminderBackgroundService : BackgroundService
{
    private readonly ILogger<DailyReminderBackgroundService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public DailyReminderBackgroundService(
        ILogger<DailyReminderBackgroundService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DailyReminderBackgroundService is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("Running Daily Appointment Reminders check at: {time}", DateTimeOffset.UtcNow);
                
                using (var scope = _serviceProvider.CreateScope())
                {
                    var useCase = scope.ServiceProvider.GetRequiredService<ISendAppointmentRemindersUseCase>();
                    await useCase.ExecuteAsync(stoppingToken);
                }

                _logger.LogInformation("Finished Daily Appointment Reminders check.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while sending appointment reminders.");
            }

            // Wait for 24 hours before running again
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }

        _logger.LogInformation("DailyReminderBackgroundService is stopping.");
    }
}
