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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AppointmentWorkerService.Tests.Unit.Application;

public class AppointmentProcessorCacheTests
{
    private readonly Mock<IAppointmentRepository> _mockAppointmentRepo;
    private readonly Mock<ICacheProvider> _mockCacheProvider;
    private readonly Mock<ILogger<AppointmentProcessor>> _mockLogger;
    private readonly Mock<ITechnicianService> _mockTechnicianService;
    private readonly Mock<IBayService> _mockBayService;
    private readonly Mock<IValidator<AppointmentMessage>> _mockValidator;
    private readonly Mock<IDistributedLock> _mockDistributedLock;
    private readonly AppointmentProcessor _processor;

    public AppointmentProcessorCacheTests()
    {
        _mockAppointmentRepo = new Mock<IAppointmentRepository>();
        _mockCacheProvider = new Mock<ICacheProvider>();
        _mockLogger = new Mock<ILogger<AppointmentProcessor>>();
        _mockTechnicianService = new Mock<ITechnicianService>();
        _mockBayService = new Mock<IBayService>();
        _mockValidator = new Mock<IValidator<AppointmentMessage>>();
        _mockDistributedLock = new Mock<IDistributedLock>();

        _mockDistributedLock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync(true);
        _mockDistributedLock.Setup(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(true);

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AppointmentMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        _processor = new AppointmentProcessor(
            _mockAppointmentRepo.Object,
            _mockCacheProvider.Object,
            _mockLogger.Object,
            _mockTechnicianService.Object,
            _mockBayService.Object,
            _mockValidator.Object,
            null!,
            null!,
            _mockDistributedLock.Object
        );
    }

    [Fact]
    public async Task ProcessAsync_Success_WritesScheduledCacheAndOccupancy()
    {
        var message = new AppointmentMessage(
            TenantId: "tenant-1",
            VehicleId: "vehicle-1",
            UserId: "user-1",
            ServiceTypeId: "service-1",
            ServiceBayId: "bay-1",
            TechnicianId: "tech-1",
            DesiredStartTime: DateTimeOffset.Parse("2026-06-03T10:00:00Z"),
            Source: "api",
            AutoAssigned: false,
            AppointmentId: "11111111-1111-1111-1111-111111111111"
        );

        _mockTechnicianService.Setup(x =>
                x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _mockBayService.Setup(x =>
                x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        await _processor.ProcessAsync(message, "msg-1");

        _mockAppointmentRepo.Verify(x => x.AddAsync(
            It.Is<TrackingRecord>(r => r.Status == AppointmentStatus.Scheduled && r.Id == Guid.Parse(message.AppointmentId)),
            It.IsAny<CancellationToken>()), Times.Once);

        _mockCacheProvider.Verify(x => x.HashSetFieldsAsync(
            CacheKeys.AppointmentHashKey(message.TenantId, message.AppointmentId),
            It.Is<Dictionary<string, string>>(fields =>
                fields["status"] == "Scheduled" &&
                fields["tenant_id"] == message.TenantId &&
                fields["id"] == message.AppointmentId),
            null), Times.Once);

        _mockCacheProvider.Verify(x => x.SortedSetAddAsync(
            CacheKeys.TechnicianOccupiedKey(message.TenantId, message.TechnicianId!),
            message.AppointmentId,
            It.Is<double>(score => score > 0)), Times.Once);

        _mockCacheProvider.Verify(x => x.SortedSetAddAsync(
            CacheKeys.BayOccupiedKey(message.TenantId, message.ServiceBayId!),
            message.AppointmentId,
            It.Is<double>(score => score > 0)), Times.Once);

        _mockCacheProvider.Verify(x => x.HashSetFieldsAsync(
            CacheKeys.OccupiedSlotHashKey(message.TenantId, message.AppointmentId),
            It.Is<Dictionary<string, string>>(fields =>
                fields["appointment_id"] == message.AppointmentId &&
                fields["start_time"] == message.DesiredStartTime.ToUniversalTime().ToString("O") &&
                fields["end_time"] == message.DesiredStartTime.ToUniversalTime().AddHours(1).ToString("O")),
            null), Times.Once);

        _mockCacheProvider.Verify(x => x.StreamAcknowledgeAsync("appointments_stream", "worker_group", "msg-1"), Times.Once);
    }

    [Fact]
    public async Task ProcessAsync_Failure_WritesFailedCacheAndRemovesActiveIndex()
    {
        var message = new AppointmentMessage(
            TenantId: "tenant-1",
            VehicleId: "vehicle-1",
            UserId: "user-1",
            ServiceTypeId: "service-1",
            ServiceBayId: "bay-1",
            TechnicianId: "tech-1",
            DesiredStartTime: DateTimeOffset.Parse("2026-06-03T10:00:00Z"),
            Source: "api",
            AutoAssigned: false,
            AppointmentId: "22222222-2222-2222-2222-222222222222"
        );

        _mockTechnicianService.Setup(x =>
                x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _mockBayService.Setup(x =>
                x.ValidateAndCheckAvailabilityAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _mockAppointmentRepo.Setup(x => x.AddAsync(It.IsAny<TrackingRecord>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DbUpdateConcurrencyException());

        await _processor.ProcessAsync(message, "msg-2");

        _mockCacheProvider.Verify(x => x.HashSetFieldsAsync(
            CacheKeys.AppointmentHashKey(message.TenantId, message.AppointmentId),
            It.Is<Dictionary<string, string>>(fields =>
                fields["status"] == "Failed" &&
                !string.IsNullOrWhiteSpace(fields["notes"])),
            TimeSpan.FromHours(1)), Times.Once);

        _mockCacheProvider.Verify(x => x.SetRemoveAsync(
            CacheKeys.ActiveAppointmentsSetKey(message.TenantId),
            message.AppointmentId), Times.Once);

        _mockCacheProvider.Verify(x => x.SortedSetAddAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<double>()), Times.Never);
        _mockCacheProvider.Verify(x => x.StreamAcknowledgeAsync("appointments_stream", "worker_group", "msg-2"), Times.Once);
    }
}
