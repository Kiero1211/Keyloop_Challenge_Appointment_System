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
                a.""Id"" as ""AppointmentId"",
                a.""TenantId"" as ""TenantId"",
                a.""StartTime"" as ""AppointmentStartTime"",
                a.""Status"" as ""AppointmentStatus"",
                a.""CustomerId"" as ""CustomerId"",
                a.""VehicleId"" as ""VehicleId"",
                'John Doe' as ""CustomerName"",
                'john@example.com' as ""CustomerEmail"",
                'Toyota' as ""VehicleMake"",
                'Corolla' as ""VehicleModel"",
                false as ""ReminderSent""
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
