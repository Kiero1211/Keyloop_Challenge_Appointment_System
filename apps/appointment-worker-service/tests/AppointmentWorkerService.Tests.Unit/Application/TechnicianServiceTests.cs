using System;
using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Services;
using AppointmentWorkerService.Core.Domain.Exceptions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AppointmentWorkerService.Tests.Unit.Application;

public class TechnicianServiceTests
{
    private readonly Mock<ITechnicianRepository> _techRepoMock;
    private readonly Mock<ITechnicianSkillRepository> _skillRepoMock;
    private readonly Mock<IAppointmentRepository> _apptRepoMock;
    private readonly Mock<ILogger<TechnicianService>> _loggerMock;
    private readonly TechnicianService _sut;

    public TechnicianServiceTests()
    {
        _techRepoMock = new Mock<ITechnicianRepository>();
        _skillRepoMock = new Mock<ITechnicianSkillRepository>();
        _apptRepoMock = new Mock<IAppointmentRepository>();
        _loggerMock = new Mock<ILogger<TechnicianService>>();

        _sut = new TechnicianService(_techRepoMock.Object, _skillRepoMock.Object, _apptRepoMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GivenTechnicianNotFound_ThenThrowsInvalidBookingRequest()
    {
        // Arrange
        _techRepoMock.Setup(x => x.ExistsAsync("tech-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidBookingRequestException>(() =>
            _sut.ValidateAndCheckAvailabilityAsync("tech-1", "svc-1", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), CancellationToken.None));
    }

    [Fact]
    public async Task GivenTechnicianLacksSkill_ThenThrowsInvalidBookingRequest()
    {
        // Arrange
        _techRepoMock.Setup(x => x.ExistsAsync("tech-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _skillRepoMock.Setup(x => x.HasSkillAsync("tech-1", "svc-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidBookingRequestException>(() =>
            _sut.ValidateAndCheckAvailabilityAsync("tech-1", "svc-1", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), CancellationToken.None));
    }

    [Fact]
    public async Task GivenTechnicianHasActiveOverlap_ThenThrowsResourceCurrentlyOccupied()
    {
        // Arrange
        _techRepoMock.Setup(x => x.ExistsAsync("tech-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _skillRepoMock.Setup(x => x.HasSkillAsync("tech-1", "svc-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _apptRepoMock.Setup(x => x.HasTechnicianOverlapAsync("tech-1", It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act & Assert
        await Assert.ThrowsAsync<ResourceCurrentlyOccupiedException>(() =>
            _sut.ValidateAndCheckAvailabilityAsync("tech-1", "svc-1", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), CancellationToken.None));
    }

    [Fact]
    public async Task GivenTechnicianAvailable_ThenCompletesWithoutException()
    {
        // Arrange
        _techRepoMock.Setup(x => x.ExistsAsync("tech-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _skillRepoMock.Setup(x => x.HasSkillAsync("tech-1", "svc-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _apptRepoMock.Setup(x => x.HasTechnicianOverlapAsync("tech-1", It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        await _sut.ValidateAndCheckAvailabilityAsync("tech-1", "svc-1", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), CancellationToken.None);

        // Assert
        Assert.True(true); // Completed without throwing
    }
}
