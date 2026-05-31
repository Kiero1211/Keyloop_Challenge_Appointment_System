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
        _context = _fixture.CreateContext("tenant-1");
        _context.Database.EnsureDeleted();
        _context.Database.EnsureCreated();
        _sut = new AppointmentRepository(_context);
    }

    public Task DisposeAsync()
    {
        _context.Dispose();
        return Task.CompletedTask;
    }

    private async Task SeedRecordAsync(string techId, string bayId, AppointmentStatus status, DateTimeOffset start, DateTimeOffset end, string tenantId = "tenant-1")
    {
        var seedContext = _fixture.CreateContext(tenantId);
        var record = new TrackingRecord
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            VehicleId = "veh-1",
            CustomerId = "cust-1",
            ServiceTypeId = "svc-1",
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
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.InProgress, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", start, end, CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenScheduledRecord_WhenCheckTechnicianOverlap_ThenReturnsTrue()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Scheduled, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", start, end, CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenCancelledRecord_WhenCheckTechnicianOverlap_ThenReturnsFalse()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Cancelled, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", start, end, CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenCompletedRecord_WhenCheckTechnicianOverlap_ThenReturnsFalse()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Completed, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", start, end, CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenDifferentTenant_WhenCheckTechnicianOverlap_ThenReturnsFalse()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Scheduled, start, end, "tenant-2");

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", start, end, CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenAdjacentSlot_WhenCheckTechnicianOverlap_ThenReturnsFalse()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", existingEnd, existingEnd.AddHours(1), CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenAdjacentSlot_StartEqualsExistingEnd_WhenCheckOverlap_ThenReturnsFalse()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", existingEnd, existingEnd.AddHours(1), CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenContainedSlot_WhenCheckOverlap_ThenReturnsTrue()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(2); // 2 hours
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", existingStart.AddMinutes(30), existingStart.AddMinutes(90), CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenExactMatchSlot_WhenCheckOverlap_ThenReturnsTrue()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Scheduled, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", start, end, CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenPartialOverlapStart_WhenCheckOverlap_ThenReturnsTrue()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", existingStart.AddMinutes(30), existingEnd.AddMinutes(30), CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task GivenPartialOverlapEnd_WhenCheckOverlap_ThenReturnsTrue()
    {
        var existingStart = DateTimeOffset.UtcNow.AddHours(1);
        var existingEnd = existingStart.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Scheduled, existingStart, existingEnd);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", existingStart.AddMinutes(-30), existingStart.AddMinutes(30), CancellationToken.None);

        Assert.True(result);
    }
    [Fact]
    public async Task GivenRejectedRecord_WhenCheckTechnicianOverlap_ThenReturnsFalse()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Rejected, start, end);

        var result = await _sut.HasTechnicianOverlapAsync("tech-1", start, end, CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task GivenExactMatchSlot_WhenCheckBayOverlap_ThenReturnsTrue()
    {
        var start = DateTimeOffset.UtcNow.AddHours(1);
        var end = start.AddHours(1);
        await SeedRecordAsync("tech-1", "bay-1", AppointmentStatus.Scheduled, start, end);

        var result = await _sut.HasBayOverlapAsync("bay-1", start, end, CancellationToken.None);

        Assert.True(result);
    }
}
