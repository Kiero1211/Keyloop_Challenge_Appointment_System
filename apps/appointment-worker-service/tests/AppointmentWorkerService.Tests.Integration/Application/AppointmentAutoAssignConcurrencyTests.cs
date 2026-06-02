using System.Collections.Concurrent;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Application.UseCases;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Domain.Exceptions;
using AppointmentWorkerService.Core.Application.Validators;
using AppointmentWorkerService.Infrastructure.Data;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace AppointmentWorkerService.Tests.Integration.Application;

public class InMemoryLock : IDistributedLock
{
    private readonly ConcurrentDictionary<string, string> _locks = new();

    public Task<bool> AcquireLockAsync(string lockKey, string lockValue, TimeSpan expiration)
    {
        return Task.FromResult(_locks.TryAdd(lockKey, lockValue));
    }

    public Task<bool> ReleaseLockAsync(string lockKey, string lockValue)
    {
        if (_locks.TryGetValue(lockKey, out var value) && value == lockValue)
        {
            return Task.FromResult(_locks.TryRemove(lockKey, out _));
        }
        return Task.FromResult(false);
    }
}

public class AppointmentAutoAssignConcurrencyTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public AppointmentAutoAssignConcurrencyTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task ProcessAsync_WhenMultipleAutoAssignRequests_ShouldOnlyAssignOneAndFailOthers()
    {
        // Arrange
        var tenantId = Guid.NewGuid().ToString();
        using var setupContext = _fixture.CreateContext(tenantId);
        
        var techId = Guid.NewGuid().ToString();
        var skillId = Guid.NewGuid().ToString();
        var bayId = Guid.NewGuid().ToString();
        var serviceTypeId = Guid.NewGuid().ToString();

        var technician = new Technician { Id = techId, FirstName = "Jane", LastName = "Doe", TenantId = tenantId };
        var skill = new TechnicianSkill { Id = skillId, TechnicianId = techId, ServiceTypeId = serviceTypeId, TenantId = tenantId };
        var bay = new ServiceBay { Id = bayId, TenantId = tenantId };
        
        setupContext.Set<Technician>().Add(technician);
        setupContext.Set<TechnicianSkill>().Add(skill);
        setupContext.Set<ServiceBay>().Add(bay);
        await setupContext.SaveChangesAsync();

        var distributedLock = new InMemoryLock();

        var cacheProviderMock = new Mock<ICacheProvider>();
        var validator = new AppointmentMessageValidator();
        var time = DateTimeOffset.UtcNow.AddDays(1);

        int numberOfConcurrentRequests = 5;
        var tasks = new List<Task>();

        // Act
        for (int i = 0; i < numberOfConcurrentRequests; i++)
        {
            var iCapture = i;
            tasks.Add(Task.Run(async () =>
            {
                using var runContext = _fixture.CreateContext(tenantId);
                var appointmentRepo = new AppointmentRepository(runContext);
                var technicianRepo = new TechnicianRepository(runContext);
                var bayRepo = new ServiceBayRepository(runContext);

                var processor = new AppointmentProcessor(
                    appointmentRepo,
                    cacheProviderMock.Object,
                    NullLogger<AppointmentProcessor>.Instance,
                    new Mock<ITechnicianService>().Object,
                    new Mock<IBayService>().Object,
                    validator,
                    technicianRepo,
                    bayRepo,
                    distributedLock);

                var vehId = Guid.NewGuid().ToString();
                var custId = Guid.NewGuid().ToString();
                
                var message = new AppointmentMessage(
                    tenantId,
                    vehId,
                    custId,
                    serviceTypeId,
                    null,
                    null,
                    time,
                    "source",
                    true
                );

                try
                {
                    await processor.ProcessAsync(message, $"msg-c-{iCapture}");
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
        
        // Exactly one should have successfully been scheduled, the rest should be Failed
        var scheduledRecords = records.Where(r => r.Status == AppointmentStatus.Scheduled).ToList();
        var failedRecords = records.Where(r => r.Status == AppointmentStatus.Failed).ToList();
        
        Assert.Single(scheduledRecords);
        Assert.Equal(numberOfConcurrentRequests - 1, failedRecords.Count);
        Assert.Equal(techId, scheduledRecords[0].TechnicianId);
        Assert.Equal(bayId, scheduledRecords[0].ServiceBayId);
    }
}
