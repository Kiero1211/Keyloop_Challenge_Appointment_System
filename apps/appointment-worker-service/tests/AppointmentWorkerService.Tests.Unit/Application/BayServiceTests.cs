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

public class BayServiceTests
{
    private readonly Mock<IServiceBayRepository> _bayRepoMock;
    private readonly Mock<IAppointmentRepository> _apptRepoMock;
    private readonly Mock<ILogger<BayService>> _loggerMock;
    private readonly BayService _sut;

    public BayServiceTests()
    {
        _bayRepoMock = new Mock<IServiceBayRepository>();
        _apptRepoMock = new Mock<IAppointmentRepository>();
        _loggerMock = new Mock<ILogger<BayService>>();

        _sut = new BayService(_bayRepoMock.Object, _apptRepoMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GivenBayNotFound_ThenThrowsInvalidBookingRequest()
    {
        // Arrange
        _bayRepoMock.Setup(x => x.ExistsAsync("bay-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidBookingRequestException>(() =>
            _sut.ValidateAndCheckAvailabilityAsync("bay-1", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), CancellationToken.None));
    }

    [Fact]
    public async Task GivenBayHasActiveOverlap_ThenThrowsResourceCurrentlyOccupied()
    {
        // Arrange
        _bayRepoMock.Setup(x => x.ExistsAsync("bay-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _apptRepoMock.Setup(x => x.HasBayOverlapAsync("bay-1", It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act & Assert
        await Assert.ThrowsAsync<ResourceCurrentlyOccupiedException>(() =>
            _sut.ValidateAndCheckAvailabilityAsync("bay-1", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), CancellationToken.None));
    }

    [Fact]
    public async Task GivenBayAvailable_ThenCompletesWithoutException()
    {
        // Arrange
        _bayRepoMock.Setup(x => x.ExistsAsync("bay-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _apptRepoMock.Setup(x => x.HasBayOverlapAsync("bay-1", It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        await _sut.ValidateAndCheckAvailabilityAsync("bay-1", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), CancellationToken.None);

        // Assert
        Assert.True(true); // Completed without throwing
    }
}
