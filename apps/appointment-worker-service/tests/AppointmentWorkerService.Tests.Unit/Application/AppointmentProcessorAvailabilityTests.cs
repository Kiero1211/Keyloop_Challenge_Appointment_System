using System;
using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Application.UseCases;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Domain.Exceptions;
using FluentValidation;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AppointmentWorkerService.Tests.Unit.Application;

public class AppointmentProcessorAvailabilityTests
{
    private readonly Mock<IAppointmentRepository> _apptRepoMock;
    private readonly Mock<ICacheProvider> _cacheMock;
    private readonly Mock<ITechnicianService> _techServiceMock;
    private readonly Mock<IBayService> _bayServiceMock;
    private readonly Mock<IValidator<AppointmentMessage>> _validatorMock;
    private readonly Mock<ILogger<AppointmentProcessor>> _loggerMock;
    private readonly AppointmentProcessor _sut;

    public AppointmentProcessorAvailabilityTests()
    {
        _apptRepoMock = new Mock<IAppointmentRepository>();
        _cacheMock = new Mock<ICacheProvider>();
        _techServiceMock = new Mock<ITechnicianService>();
        _bayServiceMock = new Mock<IBayService>();
        _validatorMock = new Mock<IValidator<AppointmentMessage>>();
        _loggerMock = new Mock<ILogger<AppointmentProcessor>>();

        _sut = new AppointmentProcessor(
            _apptRepoMock.Object,
            _cacheMock.Object,
            _loggerMock.Object,
            _techServiceMock.Object,
            _bayServiceMock.Object,
            _validatorMock.Object
        );
    }

    private AppointmentMessage CreateMessage(string? techId = "tech-1", string? bayId = "bay-1") => new(
        TenantId: "tenant-1",
        VehicleId: "veh-1",
        CustomerId: "cust-1",
        ServiceTypeId: "svc-1",
        ServiceBayId: bayId,
        TechnicianId: techId,
        DesiredStartTime: DateTimeOffset.UtcNow.AddDays(1),
        Source: "test"
    );

    [Fact]
    public async Task GivenMissingTechnicianId_WhenProcessAsync_ThenThrowsInvalidBookingRequest()
    {
        var message = CreateMessage(techId: null);
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult(new[] { new FluentValidation.Results.ValidationFailure("TechnicianId", "Error") }));

        await Assert.ThrowsAsync<InvalidBookingRequestException>(() =>
            _sut.ProcessAsync(message, "msg-1", CancellationToken.None));
    }

    [Fact]
    public async Task GivenMissingServiceBayId_WhenProcessAsync_ThenThrowsInvalidBookingRequest()
    {
        var message = CreateMessage(bayId: null);
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult(new[] { new FluentValidation.Results.ValidationFailure("ServiceBayId", "Error") }));

        await Assert.ThrowsAsync<InvalidBookingRequestException>(() =>
            _sut.ProcessAsync(message, "msg-1", CancellationToken.None));
    }

    [Fact]
    public async Task GivenTechnicianServiceThrowsInvalidRequest_WhenProcessAsync_ThenPropagates()
    {
        var message = CreateMessage();
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult());
        _techServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidBookingRequestException("Tech not found"));

        await Assert.ThrowsAsync<InvalidBookingRequestException>(() =>
            _sut.ProcessAsync(message, "msg-1", CancellationToken.None));
    }

    [Fact]
    public async Task GivenTechnicianServiceThrowsResourceOccupied_WhenProcessAsync_ThenPropagates()
    {
        var message = CreateMessage();
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult());
        _techServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ResourceCurrentlyOccupiedException("Tech occupied", It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()));

        await Assert.ThrowsAsync<ResourceCurrentlyOccupiedException>(() =>
            _sut.ProcessAsync(message, "msg-1", CancellationToken.None));
    }

    [Fact]
    public async Task GivenBayServiceThrowsResourceOccupied_WhenProcessAsync_ThenPropagates()
    {
        var message = CreateMessage();
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult());
        _techServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _bayServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ResourceCurrentlyOccupiedException("Bay occupied", It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()));

        await Assert.ThrowsAsync<ResourceCurrentlyOccupiedException>(() =>
            _sut.ProcessAsync(message, "msg-1", CancellationToken.None));
    }

    [Fact]
    public async Task GivenBothServicesOk_WhenProcessAsync_ThenPersistsConfirmedRecord()
    {
        var message = CreateMessage();
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult());
        _techServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _bayServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        await _sut.ProcessAsync(message, "msg-1", CancellationToken.None);

        _apptRepoMock.Verify(x => x.AddAsync(It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Scheduled), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GivenDbConcurrencyException_WhenProcessAsync_ThenSetsStatusToCancelled()
    {
        var message = CreateMessage();
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult());
        _techServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _bayServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _apptRepoMock.Setup(x => x.AddAsync(It.IsAny<TrackingRecord>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException());

        await _sut.ProcessAsync(message, "msg-1", CancellationToken.None);

        _cacheMock.Verify(x => x.SetAsync(It.IsAny<string>(), It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Cancelled), It.IsAny<TimeSpan?>()), Times.Once);
    }

    [Fact]
    public async Task GivenBothServicesOk_WhenProcessAsync_ThenAcknowledgesStreamMessage()
    {
        var message = CreateMessage();
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult());
        _techServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _bayServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        await _sut.ProcessAsync(message, "msg-1", CancellationToken.None);

        _cacheMock.Verify(x => x.StreamAcknowledgeAsync("appointments_stream", "worker_group", "msg-1"), Times.Once);
    }
}
