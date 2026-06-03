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
    private readonly Mock<IDistributedLock> _lockMock;
    private readonly AppointmentProcessor _sut;

    public AppointmentProcessorAvailabilityTests()
    {
        _apptRepoMock = new Mock<IAppointmentRepository>();
        _cacheMock = new Mock<ICacheProvider>();
        _techServiceMock = new Mock<ITechnicianService>();
        _bayServiceMock = new Mock<IBayService>();
        _validatorMock = new Mock<IValidator<AppointmentMessage>>();
        _loggerMock = new Mock<ILogger<AppointmentProcessor>>();
        _lockMock = new Mock<IDistributedLock>();
        
        _lockMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync(true);

        _sut = new AppointmentProcessor(
            _apptRepoMock.Object,
            _cacheMock.Object,
            _loggerMock.Object,
            _techServiceMock.Object,
            _bayServiceMock.Object,
            _validatorMock.Object,
            null!,
            null!,
            _lockMock.Object
        );
    }

    private AppointmentMessage CreateMessage(string? techId = "33333333-3333-3333-3333-333333333333", string? bayId = "55555555-5555-5555-5555-555555555555") => new(
        TenantId: "11111111-1111-1111-1111-111111111111",
        VehicleId: "99999999-9999-9999-9999-999999999999",
        UserId: "88888888-8888-8888-8888-888888888888",
        ServiceTypeId: "77777777-7777-7777-7777-777777777777",
        ServiceBayId: bayId,
        TechnicianId: techId,
        DesiredStartTime: DateTimeOffset.UtcNow.AddDays(1),
        Source: "test",
        AutoAssigned: false
    );

    [Fact]
    public async Task GivenMissingTechnicianId_WhenProcessAsync_ThenSavesFailedRecord()
    {
        var message = CreateMessage(techId: null);
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult(new[] { new FluentValidation.Results.ValidationFailure("TechnicianId", "Error") }));

        await _sut.ProcessAsync(message, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", CancellationToken.None);

        _apptRepoMock.Verify(x => x.AddAsync(It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Failed), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GivenMissingServiceBayId_WhenProcessAsync_ThenSavesFailedRecord()
    {
        var message = CreateMessage(bayId: null);
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult(new[] { new FluentValidation.Results.ValidationFailure("ServiceBayId", "Error") }));

        await _sut.ProcessAsync(message, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", CancellationToken.None);

        _apptRepoMock.Verify(x => x.AddAsync(It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Failed), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GivenTechnicianServiceThrowsInvalidRequest_WhenProcessAsync_ThenSavesFailedRecord()
    {
        var message = CreateMessage();
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult());
        _techServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidBookingRequestException("Tech not found"));

        await _sut.ProcessAsync(message, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", CancellationToken.None);

        _apptRepoMock.Verify(x => x.AddAsync(It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Failed), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GivenTechnicianServiceThrowsResourceOccupied_WhenProcessAsync_ThenSavesFailedRecord()
    {
        var message = CreateMessage();
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult());
        _techServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ResourceCurrentlyOccupiedException("Tech occupied", It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()));

        await _sut.ProcessAsync(message, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", CancellationToken.None);

        _apptRepoMock.Verify(x => x.AddAsync(It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Failed), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GivenBayServiceThrowsResourceOccupied_WhenProcessAsync_ThenSavesFailedRecord()
    {
        var message = CreateMessage();
        _validatorMock.Setup(x => x.ValidateAsync(message, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FluentValidation.Results.ValidationResult());
        _techServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _bayServiceMock.Setup(x => x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ResourceCurrentlyOccupiedException("Bay occupied", It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()));

        await _sut.ProcessAsync(message, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", CancellationToken.None);

        _apptRepoMock.Verify(x => x.AddAsync(It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Failed), It.IsAny<CancellationToken>()), Times.Once);
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

        await _sut.ProcessAsync(message, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", CancellationToken.None);

        _apptRepoMock.Verify(x => x.AddAsync(It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Scheduled), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GivenDbConcurrencyException_WhenProcessAsync_ThenSetsStatusToFailed()
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

        await _sut.ProcessAsync(message, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", CancellationToken.None);

        _cacheMock.Verify(x => x.HashSetFieldsAsync(
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, string>>(),
            TimeSpan.FromHours(1)), Times.Once);
        _cacheMock.Verify(x => x.SetRemoveAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        _cacheMock.Verify(x => x.StreamAcknowledgeAsync("appointments_stream", "worker_group", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), Times.Once);
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

        await _sut.ProcessAsync(message, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", CancellationToken.None);

        _cacheMock.Verify(x => x.StreamAcknowledgeAsync("appointments_stream", "worker_group", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), Times.Once);
    }
}
