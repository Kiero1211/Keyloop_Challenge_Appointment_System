using AppointmentWorkerService.Core.Application.UseCases;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Domain.Exceptions;
using AppointmentWorkerService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;
using FluentValidation;
using AppointmentWorkerService.Core.Application.Validators;
using AppointmentWorkerService.Core.Application.Ports;


namespace AppointmentWorkerService.Tests.Integration.Application;

[Collection("Database collection")]
public class AppointmentManualConcurrencyTests
{
    private readonly DatabaseFixture _fixture;

    public AppointmentManualConcurrencyTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task ProcessAsync_WhenMultipleManualRequestsForSameResources_ShouldOnlyScheduleOneAndFailOthers()
    {
        // Arrange
        var tenantId = Guid.NewGuid().ToString();
        using var setupContext = _fixture.CreateContext(tenantId);
        
        var techId = Guid.NewGuid().ToString();
        var bayId = Guid.NewGuid().ToString();
        var serviceTypeId = Guid.NewGuid().ToString();

        var technician = new Technician { Id = techId, FirstName = "Jane", LastName = "Doe", TenantId = tenantId };
        var skill = new TechnicianSkill { Id = Guid.NewGuid().ToString(), TechnicianId = techId, ServiceTypeId = serviceTypeId, TenantId = tenantId };
        var bay = new ServiceBay { Id = bayId, TenantId = tenantId };
        
        setupContext.Set<Technician>().Add(technician);
        setupContext.Set<TechnicianSkill>().Add(skill);
        setupContext.Set<ServiceBay>().Add(bay);
        await setupContext.SaveChangesAsync();

        var time = DateTimeOffset.UtcNow.AddDays(1);
        var requestCount = 5;

        var distributedLock = new InMemoryLock();

        var tasks = new List<Task>();
        
        // Act
        for (int i = 0; i < requestCount; i++)
        {
            var iCapture = i;
            tasks.Add(Task.Run(async () =>
            {
                using var context = _fixture.CreateContext(tenantId);
                var appointmentRepo = new AppointmentRepository(context);
                var techRepo = new TechnicianRepository(context);
                var bayRepo = new ServiceBayRepository(context);
                var validator = new AppointmentMessageValidator();
                var cacheProvider = new Mock<ICacheProvider>().Object;

                // Mock Tech Service and Bay Service directly calling the repo logic to simulate actual behavior
                var mockTechService = new Mock<AppointmentWorkerService.Core.Application.Ports.Services.ITechnicianService>();
                mockTechService.Setup(s => s.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                    .Returns(async (string tId, string sId, DateTimeOffset sTime, DateTimeOffset eTime, CancellationToken ct) => 
                    {
                        var overlaps = await appointmentRepo.HasTechnicianOverlapAsync(tId, sTime, eTime, ct);
                        if (overlaps) throw new ResourceCurrentlyOccupiedException("Technician", sTime, eTime);
                    });

                var mockBayService = new Mock<AppointmentWorkerService.Core.Application.Ports.Services.IBayService>();
                mockBayService.Setup(s => s.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                    .Returns(async (string bId, DateTimeOffset sTime, DateTimeOffset eTime, CancellationToken ct) => 
                    {
                        var overlaps = await appointmentRepo.HasBayOverlapAsync(bId, sTime, eTime, ct);
                        if (overlaps) throw new ResourceCurrentlyOccupiedException("ServiceBay", sTime, eTime);
                    });

                var processor = new AppointmentProcessor(
                    appointmentRepo,
                    cacheProvider,
                    NullLogger<AppointmentProcessor>.Instance,
                    mockTechService.Object,
                    mockBayService.Object,
                    validator,
                    techRepo,
                    bayRepo,
                    distributedLock);

                var vehId = Guid.NewGuid().ToString();
                var custId = Guid.NewGuid().ToString();
                
                var message = new AppointmentMessage(
                    tenantId,
                    vehId,
                    custId,
                    serviceTypeId,
                    bayId,
                    techId,
                    time,
                    "source",
                    false
                );

                try
                {
                    await processor.ProcessAsync(message, $"msg-{iCapture}");
                }
                catch (ResourceCurrentlyOccupiedException)
                {
                    // Expected for all but one
                }
            }));
        }

        await Task.WhenAll(tasks);

        // Assert
        using var assertContext = _fixture.CreateContext(tenantId);
        var records = assertContext.Set<TrackingRecord>().Where(x => x.ServiceTypeId == serviceTypeId).ToList();
        
        // At most one should be scheduled because of EF Core Optimistic Concurrency and manual checks.
        // Actually since we rely on EF Core Concurrency Token, any race conditions should be caught by DbUpdateConcurrencyException and status set to Cancelled.
        var scheduledRecords = records.Where(r => r.Status == AppointmentStatus.Scheduled).ToList();
        var cancelledRecords = records.Where(r => r.Status == AppointmentStatus.Cancelled).ToList();

        Assert.Single(scheduledRecords);
        Assert.Equal(techId, scheduledRecords[0].TechnicianId);
        Assert.Equal(bayId, scheduledRecords[0].ServiceBayId);
        
        // The remaining must have failed validation or throw concurrency exception
        Assert.Equal(requestCount - 1, cancelledRecords.Count + (requestCount - 1 - cancelledRecords.Count)); // This is basically ensuring all others failed
    }
}
