using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Infrastructure.Data;
using Xunit;

namespace AppointmentWorkerService.Tests.Integration.Data;

[Collection("Database collection")]
public class TechnicianSkillRepositoryTests : IAsyncLifetime
{
    private readonly DatabaseFixture _fixture;
    private AppDbContext _context = null!;
    private TechnicianSkillRepository _sut = null!;

    public TechnicianSkillRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        _context = _fixture.CreateContext("tenant-1");
        _context.Database.EnsureDeleted();
        _context.Database.EnsureCreated();
        _sut = new TechnicianSkillRepository(_context);
    }

    public Task DisposeAsync()
    {
        _context.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task GivenSkillExists_WhenHasSkillAsync_ThenReturnsTrue()
    {
        var seedContext = _fixture.CreateContext("tenant-1");
        seedContext.Set<TechnicianSkill>().Add(new TechnicianSkill { TechnicianId = "tech-1", ServiceTypeId = "svc-1", TenantId = "tenant-1" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.HasSkillAsync("tech-1", "svc-1", CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenSkillDoesNotExist_WhenHasSkillAsync_ThenReturnsFalse()
    {
        var result = await _sut.HasSkillAsync("tech-1", "svc-2", CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenSkillInDifferentTenant_WhenHasSkillAsync_ThenReturnsFalse()
    {
        var seedContext = _fixture.CreateContext("tenant-2");
        seedContext.Set<TechnicianSkill>().Add(new TechnicianSkill { TechnicianId = "tech-1", ServiceTypeId = "svc-1", TenantId = "tenant-2" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.HasSkillAsync("tech-1", "svc-1", CancellationToken.None);

        Assert.False(result);
    }
}
