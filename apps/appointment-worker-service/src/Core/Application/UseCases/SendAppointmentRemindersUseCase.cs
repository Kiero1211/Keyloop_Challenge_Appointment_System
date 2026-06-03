using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Application.Ports.Repositories;

namespace AppointmentWorkerService.Core.Application.UseCases;

public interface ISendAppointmentRemindersUseCase
{
    Task ExecuteAsync(CancellationToken cancellationToken = default);
}

public class SendAppointmentRemindersUseCase : ISendAppointmentRemindersUseCase
{
    private readonly IAppointmentReminderRepository _repository;
    private readonly IEmailService _emailService;

    public SendAppointmentRemindersUseCase(IAppointmentReminderRepository repository, IEmailService emailService)
    {
        _repository = repository;
        _emailService = emailService;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var pendingReminders = await _repository.GetPendingRemindersAsync(cancellationToken);

        foreach (var reminderData in pendingReminders)
        {
            var subject = $"Reminder: Your appointment on {reminderData.AppointmentStartTime:MMM dd, yyyy}";
            var body = $@"Hello {reminderData.UserName},

This is a reminder for your upcoming appointment on {reminderData.AppointmentStartTime:MMM dd, yyyy h:mm tt} 
for your {reminderData.VehicleMake} {reminderData.VehicleModel}.

We look forward to seeing you!";

            await _emailService.SendEmailAsync(reminderData.UserEmail, subject, body, cancellationToken);

            var reminderRecord = new AppointmentReminder
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = reminderData.TenantId,
                AppointmentId = reminderData.AppointmentId,
                SentAt = DateTimeOffset.UtcNow
            };

            // await _repository.AddReminderAsync(reminderRecord, cancellationToken);
        }
    }
}
