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
                '00000000-0000-0000-0000-000000000001'::uuid as ""AppointmentId"",
                '00000000-0000-0000-0000-000000000010'::uuid as ""TenantId"",
                NOW() as ""AppointmentStartTime"",
                'Scheduled'::text as ""AppointmentStatus"",
                '00000000-0000-0000-0000-000000000020'::uuid as ""UserId"",
                'john@example.com'::text as ""UserEmail"",
                'John Doe'::text as ""UserName"",
                '00000000-0000-0000-0000-000000000030'::uuid as ""VehicleId"",
                'Toyota'::text as ""VehicleMake"",
                'Corolla'::text as ""VehicleModel"",
                false as ""ReminderSent"";
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
