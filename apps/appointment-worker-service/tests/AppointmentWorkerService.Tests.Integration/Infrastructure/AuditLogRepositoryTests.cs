using System.Text.Json;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace AppointmentWorkerService.Tests.Integration.Infrastructure;

public class AuditLogRepositoryTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    private ServiceProvider _serviceProvider = null!;
    private AppDbContext _dbContext = null!;
    private string _tenantId = Guid.NewGuid().ToString();

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();

        var services = new ServiceCollection();
        
        services.AddScoped<AuditLogInterceptor>();

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            var interceptor = sp.GetRequiredService<AuditLogInterceptor>();
            options.UseNpgsql(_dbContainer.GetConnectionString())
                   .UseSnakeCaseNamingConvention()
                   .AddInterceptors(interceptor);
        });

        services.AddScoped<ITenantService>(sp => new MockTenantService(_tenantId));
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();

        _serviceProvider = services.BuildServiceProvider();
        _dbContext = _serviceProvider.GetRequiredService<AppDbContext>();

        await _dbContext.Database.EnsureCreatedAsync();
        
        // Execute the partition creation manually because EnsureCreated doesn't run raw SQL from migrations usually,
        // but for integration tests, EnsureCreated creates the table. The partition might not be strictly necessary for tests if we just use a regular table,
        // but let's see if the schema from EnsureCreated works. Actually, EF Core EnsureCreated will just create regular tables, not partitioned ones. That's fine for testing.
    }

    public async Task DisposeAsync()
    {
        await _dbContainer.DisposeAsync();
    }

    [Fact]
    public async Task SaveChanges_WithNewEntity_ShouldGenerateAuditLog()
    {
        // Arrange
        var bay = new ServiceBay
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = _tenantId,
            Name = "Bay 1"
        };

        // Act
        _dbContext.ServiceBays.Add(bay);
        await _dbContext.SaveChangesAsync();

        // Assert
        var logs = await _dbContext.AuditLogs.ToListAsync();
        Assert.Single(logs);
        
        var log = logs.First();
        Assert.Equal(_tenantId, log.TenantId);
        Assert.Equal("ServiceBay", log.EntityType);
        Assert.Equal(bay.Id.ToString(), log.EntityId);
        Assert.Equal("CREATE", log.Action);
        
        var payload = JsonDocument.Parse(log.Result);
        Assert.Equal("Bay 1", payload.RootElement.GetProperty("Name").GetString());
    }

    [Fact]
    public async Task SaveChanges_WithModifiedEntity_ShouldGenerateAuditLog()
    {
        // Arrange
        var bay = new ServiceBay
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = _tenantId,
            Name = "Bay 1"
        };
        _dbContext.ServiceBays.Add(bay);
        await _dbContext.SaveChangesAsync();
        
        // Clear state to simulate fresh context
        _dbContext.ChangeTracker.Clear();

        var trackedBay = await _dbContext.ServiceBays.FirstAsync(b => b.Id == bay.Id);
        trackedBay.Name = "Bay 2 Updated";

        // Act
        await _dbContext.SaveChangesAsync();

        // Assert
        var logs = await _dbContext.AuditLogs.OrderBy(l => l.Timestamp).ToListAsync();
        Assert.Equal(2, logs.Count); // 1 create, 1 update
        
        var log = logs.Last();
        Assert.Equal("UPDATE", log.Action);
        
        var payload = JsonDocument.Parse(log.Result);
        Assert.Equal("Bay 1", payload.RootElement.GetProperty("Name_Old").GetString());
        Assert.Equal("Bay 2 Updated", payload.RootElement.GetProperty("Name_New").GetString());
    }

    [Fact]
    public async Task SaveChanges_WithDeletedEntity_ShouldGenerateAuditLog()
    {
        // Arrange
        var bay = new ServiceBay
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = _tenantId,
            Name = "Bay To Delete"
        };
        _dbContext.ServiceBays.Add(bay);
        await _dbContext.SaveChangesAsync();
        
        // Clear state
        _dbContext.ChangeTracker.Clear();

        var trackedBay = await _dbContext.ServiceBays.FirstAsync(b => b.Id == bay.Id);
        _dbContext.ServiceBays.Remove(trackedBay);

        // Act
        await _dbContext.SaveChangesAsync();

        // Assert
        var logs = await _dbContext.AuditLogs.OrderBy(l => l.Timestamp).ToListAsync();
        Assert.Equal(2, logs.Count); // 1 create, 1 delete
        
        var log = logs.Last();
        Assert.Equal("DELETE", log.Action);
        
        var payload = JsonDocument.Parse(log.Result);
        Assert.Equal("Bay To Delete", payload.RootElement.GetProperty("Name").GetString());
    }
}

public class MockTenantService : ITenantService
{
    private readonly string _tenantId;

    public MockTenantService(string tenantId)
    {
        _tenantId = tenantId;
    }

    public string GetTenantId() => _tenantId;
}
