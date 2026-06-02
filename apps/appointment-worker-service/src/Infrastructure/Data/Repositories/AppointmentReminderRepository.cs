using Microsoft.EntityFrameworkCore;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Infrastructure.Data;

namespace AppointmentWorkerService.Infrastructure.Data.Repositories;

public class AppointmentReminderRepository : IAppointmentReminderRepository
{
    private readonly AppDbContext _context;

    public AppointmentReminderRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AppointmentReminderData>> GetPendingRemindersAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var threshold = now.AddHours(48); // We want to send reminders for appointments in the next 48 hours

        return await _context.AppointmentReminderView
            .IgnoreQueryFilters()
            .Where(r => 
                !r.ReminderSent && 
                r.AppointmentStatus == AppointmentStatus.Scheduled &&
                r.AppointmentStartTime > now && 
                r.AppointmentStartTime <= threshold)
            .ToListAsync(cancellationToken);
    }

    public async Task AddReminderAsync(AppointmentReminder reminder, CancellationToken cancellationToken = default)
    {
        _context.AppointmentReminders.Add(reminder);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
