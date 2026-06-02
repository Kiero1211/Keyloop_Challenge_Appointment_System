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
        _context = _fixture.CreateContext("11111111-1111-1111-1111-111111111111");
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
        var seedContext = _fixture.CreateContext("11111111-1111-1111-1111-111111111111");
        seedContext.Set<Technician>().Add(new Technician { Id = "33333333-3333-3333-3333-333333333333", TenantId = "11111111-1111-1111-1111-111111111111", FirstName = "John" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.ExistsAsync("33333333-3333-3333-3333-333333333333", CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenTechnicianDoesNotExist_WhenExistsAsync_ThenReturnsFalse()
    {
        var result = await _sut.ExistsAsync("44444444-4444-4444-4444-444444444444", CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenTechnicianInDifferentTenant_WhenExistsAsync_ThenReturnsFalse()
    {
        var seedContext = _fixture.CreateContext("22222222-2222-2222-2222-222222222222");
        seedContext.Set<Technician>().Add(new Technician { Id = "33333333-3333-3333-3333-333333333333", TenantId = "22222222-2222-2222-2222-222222222222", FirstName = "John" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.ExistsAsync("33333333-3333-3333-3333-333333333333", CancellationToken.None);

        Assert.False(result);
    }
}
