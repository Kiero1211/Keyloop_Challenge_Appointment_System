using System;
using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Infrastructure.Data;
using Xunit;

namespace AppointmentWorkerService.Tests.Integration.Data;

[CollectionDefinition("Database collection")]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture> { }

[Collection("Database collection")]
public class AppointmentRepositoryOverlapTests : IAsyncLifetime
{
    private readonly DatabaseFixture _fixture;
    private AppDbContext _context = null!;
    private AppointmentRepository _sut = null!;

    public AppointmentRepositoryOverlapTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        _context = _fixture.CreateContext("11111111-1111-1111-1111-111111111111");
        _context.Database.EnsureDeleted();
        _context.Database.EnsureCreated();
        _sut = new AppointmentRepository(_context);
    }

    public Task DisposeAsync()
    {
        _context.Dispose();
        return Task.CompletedTask;
    }

    private async Task SeedRecordAsync(string techId, string bayId, AppointmentStatus status, DateTimeOffset start, DateTimeOffset end, string tenantId = "11111111-1111-1111-1111-111111111111")
    {
        var seedContext = _fixture.CreateContext(tenantId);
        var record = new TrackingRecord
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            VehicleId = "99999999-9999-9999-9999-999999999999",
            UserId = "88888888-8888-8888-8888-888888888888",
            ServiceTypeId = "77777777-7777-7777-7777-777777777777",
            TechnicianId = techId,
            ServiceBayId = bayId,
            StartTime = start,
            EndTime = end,
            Status = status
        };
        seedContext.Set<TrackingRecord>().Add(record);
        await seedContext.SaveChangesAsync();
    }

    [Fact]
    public async Task GivenInProgressRecord_WhenCheckTechnicianOverlap_ThenReturnsTrue()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.InProgress, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", start, end, CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenScheduledRecord_WhenCheckTechnicianOverlap_ThenReturnsTrue()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Scheduled, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", start, end, CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenCancelledRecord_WhenCheckTechnicianOverlap_ThenReturnsFalse()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Cancelled, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", start, end, CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenCompletedRecord_WhenCheckTechnicianOverlap_ThenReturnsFalse()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Completed, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", start, end, CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenDifferentTenant_WhenCheckTechnicianOverlap_ThenReturnsFalse()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Scheduled, start, end, "22222222-2222-2222-2222-222222222222");

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", start, end, CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenAdjacentSlot_WhenCheckTechnicianOverlap_ThenReturnsFalse()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", existingEnd, existingEnd.AddHours(1), CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenAdjacentSlot_StartEqualsExistingEnd_WhenCheckOverlap_ThenReturnsFalse()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", existingEnd, existingEnd.AddHours(1), CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenContainedSlot_WhenCheckOverlap_ThenReturnsTrue()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(2); // 2 hours
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", existingStart.AddMinutes(30), existingStart.AddMinutes(90), CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenExactMatchSlot_WhenCheckOverlap_ThenReturnsTrue()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Scheduled, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", start, end, CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenPartialOverlapStart_WhenCheckOverlap_ThenReturnsTrue()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", existingStart.AddMinutes(30), existingEnd.AddMinutes(30), CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenPartialOverlapEnd_WhenCheckOverlap_ThenReturnsTrue()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("33333333-3333-3333-3333-333333333333", existingStart.AddMinutes(-30), existingStart.AddMinutes(30), CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenExactMatchSlot_WhenCheckBayOverlap_ThenReturnsTrue()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", AppointmentStatus.Scheduled, start, end);

        var result = await _sut.HasBayOverlapAsync("55555555-5555-5555-5555-555555555555", start, end, CancellationToken.None);

        Assert.True(result);
    }
}
