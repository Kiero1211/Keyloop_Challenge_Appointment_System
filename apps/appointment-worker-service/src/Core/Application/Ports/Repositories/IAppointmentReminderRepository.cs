using AppointmentWorkerService.Core.Domain.Entities;

namespace AppointmentWorkerService.Core.Application.Ports.Repositories;

public interface IAppointmentReminderRepository
{
    Task<IEnumerable<AppointmentReminderData>> GetPendingRemindersAsync(CancellationToken cancellationToken = default);
    Task AddReminderAsync(AppointmentReminder reminder, CancellationToken cancellationToken = default);
}
