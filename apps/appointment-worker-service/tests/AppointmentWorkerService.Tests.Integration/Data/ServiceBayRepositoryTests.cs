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
        _context = _fixture.CreateContext("11111111-1111-1111-1111-111111111111");
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
        var seedContext = _fixture.CreateContext("11111111-1111-1111-1111-111111111111");
        seedContext.Set<ServiceBay>().Add(new ServiceBay { Id = "55555555-5555-5555-5555-555555555555", TenantId = "11111111-1111-1111-1111-111111111111", Name = "Bay 1" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.ExistsAsync("55555555-5555-5555-5555-555555555555", CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenServiceBayDoesNotExist_WhenExistsAsync_ThenReturnsFalse()
    {
        var result = await _sut.ExistsAsync("66666666-6666-6666-6666-666666666666", CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenServiceBayInDifferentTenant_WhenExistsAsync_ThenReturnsFalse()
    {
        var seedContext = _fixture.CreateContext("22222222-2222-2222-2222-222222222222");
        seedContext.Set<ServiceBay>().Add(new ServiceBay { Id = "55555555-5555-5555-5555-555555555555", TenantId = "22222222-2222-2222-2222-222222222222", Name = "Bay 1" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.ExistsAsync("55555555-5555-5555-5555-555555555555", CancellationToken.None);

        Assert.False(result);
    }
}
