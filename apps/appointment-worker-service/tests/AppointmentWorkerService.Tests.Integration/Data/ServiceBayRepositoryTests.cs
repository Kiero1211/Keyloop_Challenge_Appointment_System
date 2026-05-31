using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Infrastructure.Data;
using Xunit;

namespace AppointmentWorkerService.Tests.Integration.Data;

[Collection("Database collection")]
public class ServiceBayRepositoryTests : IAsyncLifetime
{
    private readonly DatabaseFixture _fixture;
    private AppDbContext _context = null!;
    private ServiceBayRepository _sut = null!;

    public ServiceBayRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        _context = _fixture.CreateContext("tenant-1");
        _context.Database.EnsureDeleted();
        _context.Database.EnsureCreated();
        _sut = new ServiceBayRepository(_context);
    }

    public Task DisposeAsync()
    {
        _context.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task GivenServiceBayExists_WhenExistsAsync_ThenReturnsTrue()
    {
        var seedContext = _fixture.CreateContext("tenant-1");
        seedContext.Set<ServiceBay>().Add(new ServiceBay { Id = "bay-1", TenantId = "tenant-1", Name = "Bay 1" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.ExistsAsync("bay-1", CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenServiceBayDoesNotExist_WhenExistsAsync_ThenReturnsFalse()
    {
        var result = await _sut.ExistsAsync("bay-2", CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenServiceBayInDifferentTenant_WhenExistsAsync_ThenReturnsFalse()
    {
        var seedContext = _fixture.CreateContext("tenant-2");
        seedContext.Set<ServiceBay>().Add(new ServiceBay { Id = "bay-1", TenantId = "tenant-2", Name = "Bay 1" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.ExistsAsync("bay-1", CancellationToken.None);

        Assert.False(result);
    }
}
