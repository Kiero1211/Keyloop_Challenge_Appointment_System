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
        _context = _fixture.CreateContext("11111111-1111-1111-1111-111111111111");
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
        var seedContext = _fixture.CreateContext("11111111-1111-1111-1111-111111111111");
        seedContext.Set<TechnicianSkill>().Add(new TechnicianSkill { Id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", TechnicianId = "33333333-3333-3333-3333-333333333333", ServiceTypeId = "77777777-7777-7777-7777-777777777777", TenantId = "11111111-1111-1111-1111-111111111111" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.HasSkillAsync("33333333-3333-3333-3333-333333333333", "77777777-7777-7777-7777-777777777777", CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenSkillDoesNotExist_WhenHasSkillAsync_ThenReturnsFalse()
    {
        var result = await _sut.HasSkillAsync("33333333-3333-3333-3333-333333333333", "77777777-7777-7777-7777-777777777772", CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenSkillInDifferentTenant_WhenHasSkillAsync_ThenReturnsFalse()
    {
        var seedContext = _fixture.CreateContext("22222222-2222-2222-2222-222222222222");
        seedContext.Set<TechnicianSkill>().Add(new TechnicianSkill { Id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", TechnicianId = "33333333-3333-3333-3333-333333333333", ServiceTypeId = "77777777-7777-7777-7777-777777777777", TenantId = "22222222-2222-2222-2222-222222222222" });
        await seedContext.SaveChangesAsync();

        var result = await _sut.HasSkillAsync("33333333-3333-3333-3333-333333333333", "77777777-7777-7777-7777-777777777777", CancellationToken.None);

        Assert.False(result);
    }
}
