using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Infrastructure.Data;
using Xunit;

namespace AppointmentWorkerService.Tests.Integration.Data;

[Collection("Database collection")]
public class TechnicianRepositoryTests : IAsyncLifetime
{
    private readonly DatabaseFixture _fixture;
    private AppDbContext _context = null!;
    private TechnicianRepository _sut = null!;

    public TechnicianRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        _context = _fixture.CreateContext("tenant-1");
        _context.Database.EnsureDeleted();
        _context.Database.EnsureCreated();
        _sut = new TechnicianRepository(_context);
    }

    public Task DisposeAsync()
    {
        _context.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task GivenTechnicianExists_WhenExistsAsync_ThenReturnsTrue()
    {
        var seedContext = _fixture.CreateContext("tenant-1");
        seedContext.Set<Technician>().Add(new Technician { Id = "tech-1", TenantId = "tenant-1", Name = "John" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.ExistsAsync("tech-1", CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenTechnicianDoesNotExist_WhenExistsAsync_ThenReturnsFalse()
    {
        var result = await _sut.ExistsAsync("tech-2", CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenTechnicianInDifferentTenant_WhenExistsAsync_ThenReturnsFalse()
    {
        var seedContext = _fixture.CreateContext("tenant-2");
        seedContext.Set<Technician>().Add(new Technician { Id = "tech-1", TenantId = "tenant-2", Name = "John" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.ExistsAsync("tech-1", CancellationToken.None);

        Assert.False(result);
    }
}
