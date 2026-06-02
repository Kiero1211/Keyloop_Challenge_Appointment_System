using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Application.UseCases;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Application.Validators;
using AppointmentWorkerService.Infrastructure.Data;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace AppointmentWorkerService.Tests.Integration.Application;

public class AppointmentAutoAssignTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public AppointmentAutoAssignTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task ProcessAsync_WithAutoAssignedTrue_ShouldAssignAvailableTechnicianAndBay()
    {
        // Arrange
        var tenantId = Guid.NewGuid().ToString();
        using var context = _fixture.CreateContext(tenantId);
        
        var techId = Guid.NewGuid().ToString();
        var skillId = Guid.NewGuid().ToString();
        var bayId = Guid.NewGuid().ToString();
        var serviceTypeId = Guid.NewGuid().ToString();

        var technician = new Technician { Id = techId, FirstName = "John", LastName = "Doe", TenantId = tenantId };
        var skill = new TechnicianSkill { Id = skillId, TechnicianId = techId, ServiceTypeId = serviceTypeId, TenantId = tenantId };
        var bay = new ServiceBay { Id = bayId, TenantId = tenantId };
        
        context.Set<Technician>().Add(technician);
        context.Set<TechnicianSkill>().Add(skill);
        context.Set<ServiceBay>().Add(bay);
        await context.SaveChangesAsync();

        var appointmentRepo = new AppointmentRepository(context);
        var technicianRepo = new TechnicianRepository(context);
        var bayRepo = new ServiceBayRepository(context);
        
        var cacheProviderMock = new Mock<ICacheProvider>();
        var distributedLockMock = new Mock<IDistributedLock>();
        
        // Mock locks to always succeed
        distributedLockMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync(true);
        distributedLockMock.Setup(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(true);

        var processor = new AppointmentProcessor(
            appointmentRepo,
            cacheProviderMock.Object,
            NullLogger<AppointmentProcessor>.Instance,
            new Mock<ITechnicianService>().Object,
            new Mock<IBayService>().Object,
            new AppointmentMessageValidator(),
            technicianRepo,
            bayRepo,
            distributedLockMock.Object);

        var vehId = Guid.NewGuid().ToString();
        var custId = Guid.NewGuid().ToString();

        var message = new AppointmentMessage(
            tenantId,
            vehId,
            custId,
            serviceTypeId,
            null,
            null,
            DateTimeOffset.UtcNow.AddDays(1),
            "source",
            true // AutoAssigned = true
        );
        
        // Act
        await processor.ProcessAsync(message, "msg-1");
        
        // Assert
        var record = context.Set<TrackingRecord>().FirstOrDefault(x => x.VehicleId == vehId);
        Assert.NotNull(record);
        Assert.Equal(techId, record!.TechnicianId);
        Assert.Equal(bayId, record.ServiceBayId);
        
        distributedLockMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Exactly(2)); // Released both locks
    }
}
