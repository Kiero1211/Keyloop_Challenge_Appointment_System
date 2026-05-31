using AppointmentWorkerService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Moq;
using Testcontainers.PostgreSql;

namespace AppointmentWorkerService.Tests.Integration;

public class DatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgreSqlContainer;

    public DatabaseFixture()
    {
        _postgreSqlContainer = new PostgreSqlBuilder()
            .WithImage("postgres:15-alpine")
            .WithDatabase("appointment_db")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _postgreSqlContainer.StartAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_postgreSqlContainer.GetConnectionString())
            .Options;

        var tenantServiceMock = new Mock<ITenantService>();
        tenantServiceMock.Setup(m => m.GetTenantId()).Returns("default-tenant");

        using var context = new AppDbContext(options, tenantServiceMock.Object);
        await context.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await _postgreSqlContainer.DisposeAsync();
    }

    public AppDbContext CreateContext(string tenantId = "default-tenant")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_postgreSqlContainer.GetConnectionString())
            .Options;

        var tenantServiceMock = new Mock<ITenantService>();
        tenantServiceMock.Setup(m => m.GetTenantId()).Returns(tenantId);

        return new AppDbContext(options, tenantServiceMock.Object);
    }
}
