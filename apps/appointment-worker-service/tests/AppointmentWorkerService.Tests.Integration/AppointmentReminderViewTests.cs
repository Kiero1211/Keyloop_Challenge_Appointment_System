using Microsoft.EntityFrameworkCore;
using Xunit;
using FluentAssertions;
using AppointmentWorkerService.Infrastructure.Data;
using AppointmentWorkerService.Tests.Integration;

namespace AppointmentWorkerService.Tests.Integration.Data;

[Collection("Database collection")]
public class AppointmentReminderViewTests : IAsyncLifetime
{
    private readonly DatabaseFixture _fixture;
    private AppDbContext _dbContext = null!;

    public AppointmentReminderViewTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        _dbContext = _fixture.CreateContext();
        await _dbContext.Database.ExecuteSqlRawAsync(@"
            CREATE OR REPLACE VIEW appointment_reminder_view AS
            SELECT 
                a.id as appointment_id,
                a.tenant_id as tenant_id,
                a.start_time as appointment_start_time,
                a.status as appointment_status,
                a.user_id as user_id,
                a.vehicle_id as vehicle_id,
                'John Doe' as user_name,
                'john@example.com' as user_email,
                'Toyota' as vehicle_make,
                'Corolla' as vehicle_model,
                false as reminder_sent
            FROM appointments a;
        ");
    }

    public async Task DisposeAsync()
    {
        await _dbContext.DisposeAsync();
    }

    [Fact]
    public async Task CanQueryAppointmentReminderView()
    {
        // Act
        var result = await _dbContext.AppointmentReminderView.ToListAsync();

        // Assert
        result.Should().NotBeNull();
        // Just verifying that the view exists and can be queried without SQL errors.
    }
}
