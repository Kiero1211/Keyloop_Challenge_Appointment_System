using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Application.UseCases;
using AppointmentWorkerService.Core.Domain;
using AppointmentWorkerService.Core.Domain.Entities;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AppointmentWorkerService.Tests.Unit.Application;

public class AppointmentProcessorAutoAssignTests
{
    private readonly Mock<IAppointmentRepository> _appointmentRepositoryMock;
    private readonly Mock<ICacheProvider> _cacheProviderMock;
    private readonly Mock<ITechnicianService> _technicianServiceMock;
    private readonly Mock<IBayService> _bayServiceMock;
    private readonly Mock<IValidator<AppointmentMessage>> _validatorMock;
    private readonly Mock<ILogger<AppointmentProcessor>> _loggerMock;
    private readonly Mock<IDistributedLock> _distributedLockMock;
    private readonly Mock<ITechnicianRepository> _technicianRepositoryMock;
    private readonly Mock<IServiceBayRepository> _serviceBayRepositoryMock;
    private readonly AppointmentProcessor _sut;

    public AppointmentProcessorAutoAssignTests()
    {
        _appointmentRepositoryMock = new Mock<IAppointmentRepository>();
        _cacheProviderMock = new Mock<ICacheProvider>();
        _technicianServiceMock = new Mock<ITechnicianService>();
        _bayServiceMock = new Mock<IBayService>();
        _validatorMock = new Mock<IValidator<AppointmentMessage>>();
        _loggerMock = new Mock<ILogger<AppointmentProcessor>>();
        _distributedLockMock = new Mock<IDistributedLock>();
        _technicianRepositoryMock = new Mock<ITechnicianRepository>();
        _serviceBayRepositoryMock = new Mock<IServiceBayRepository>();

        _validatorMock.Setup(v => v.ValidateAsync(It.IsAny<AppointmentMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());
        _distributedLockMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync(true);
        _distributedLockMock.Setup(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(true);

        _sut = new AppointmentProcessor(
            _appointmentRepositoryMock.Object,
            _cacheProviderMock.Object,
            _loggerMock.Object,
            _technicianServiceMock.Object,
            _bayServiceMock.Object,
            _validatorMock.Object,
            _technicianRepositoryMock.Object,
            _serviceBayRepositoryMock.Object,
            _distributedLockMock.Object
        );
    }

    [Fact]
    public async Task GivenAutoAssignWhenNoResourcesAvailable_WhenProcessAsync_ThenMarksFailedAndKeepsInActiveIndex()
    {
        var message = new AppointmentMessage(
            TenantId: "tenant-1",
            VehicleId: "vehicle-1",
            UserId: "user-1",
            ServiceTypeId: "service-1",
            ServiceBayId: null,
            TechnicianId: null,
            DesiredStartTime: DateTimeOffset.Parse("2026-06-03T10:00:00Z"),
            Source: "api",
            AutoAssigned: true,
            AppointmentId: "33333333-3333-3333-3333-333333333333"
        );

        _technicianRepositoryMock.Setup(x => x.GetTechniciansBySkillAsync(message.ServiceTypeId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<string>());
        _serviceBayRepositoryMock.Setup(x => x.GetAllBaysAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<string>());

        await _sut.ProcessAsync(message, "msg-auto-1");

        _appointmentRepositoryMock.Verify(x => x.AddAsync(
            It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Failed),
            It.IsAny<CancellationToken>()), Times.Once);

        _cacheProviderMock.Verify(x => x.HashSetFieldsAsync(
            CacheKeys.AppointmentHashKey(message.TenantId, message.AppointmentId),
            It.Is<Dictionary<string, string>>(fields => fields["status"] == "Failed"),
            TimeSpan.FromHours(1)), Times.Once);

        _cacheProviderMock.Verify(x => x.SetAddAsync(
            CacheKeys.ActiveAppointmentsSetKey(message.TenantId),
            message.AppointmentId), Times.Once);

        _cacheProviderMock.Verify(x => x.StreamAcknowledgeAsync("appointments_stream", "worker_group", "msg-auto-1"), Times.Once);
    }
}
