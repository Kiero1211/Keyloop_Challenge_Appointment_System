using System;
using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Application.UseCases;
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
    private readonly AppointmentProcessor _processor;

    public AppointmentProcessorCacheTests()
    {
        _mockAppointmentRepo = new Mock<IAppointmentRepository>();
        _mockCacheProvider = new Mock<ICacheProvider>();
        _mockLogger = new Mock<ILogger<AppointmentProcessor>>();
        _mockTechnicianService = new Mock<ITechnicianService>();
        _mockBayService = new Mock<IBayService>();
        _mockValidator = new Mock<IValidator<AppointmentMessage>>();

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AppointmentMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        _processor = new AppointmentProcessor(
            _mockAppointmentRepo.Object,
            _mockCacheProvider.Object,
            _mockLogger.Object,
            _mockTechnicianService.Object,
            _mockBayService.Object,
            _mockValidator.Object
        );
    }

    [Fact]
    public async Task ProcessAsync_Success_InvalidatesCache_WithNoTTL()
    {
        // Arrange
        var message = new AppointmentMessage(
            "11111111-1111-1111-1111-111111111111",
            "99999999-9999-9999-9999-999999999991",
            "88888888-8888-8888-8888-888888888881",
            "77777777-7777-7777-7777-777777777771",
            "33333333-3333-3333-3333-333333333333",
            "55555555-5555-5555-5555-555555555555",
            DateTime.UtcNow,
            "source-1"
        );
        var messageId = "msg-123";

        // Act
        await _processor.ProcessAsync(message, messageId);

        // Assert
        _mockCacheProvider.Verify(c => c.SetAsync(
            It.Is<string>(key => key.StartsWith("11111111-1111-1111-1111-111111111111:AppointmentDetail:")),
            It.IsAny<object>(),
            null
        ), Times.Once);
        
        _mockCacheProvider.Verify(c => c.StreamAcknowledgeAsync("appointments_stream", "worker_group", messageId), Times.Once);
    }

    [Fact]
    public async Task ProcessAsync_ConcurrencyConflict_InvalidatesCache_WithTTL()
    {
        // Arrange
        var message = new AppointmentMessage(
            "11111111-1111-1111-1111-111111111111",
            "99999999-9999-9999-9999-999999999991",
            "88888888-8888-8888-8888-888888888881",
            "77777777-7777-7777-7777-777777777771",
            "33333333-3333-3333-3333-333333333333",
            "55555555-5555-5555-5555-555555555555",
            DateTime.UtcNow,
            "source-1"
        );
        var messageId = "msg-123";

        _mockAppointmentRepo.Setup(r => r.AddAsync(It.IsAny<TrackingRecord>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DbUpdateConcurrencyException());

        // Act
        await _processor.ProcessAsync(message, messageId);

        // Assert
        _mockCacheProvider.Verify(c => c.SetAsync(
            It.Is<string>(key => key.StartsWith("11111111-1111-1111-1111-111111111111:AppointmentDetail:")),
            It.IsAny<object>(),
            TimeSpan.FromHours(6)
        ), Times.Once);

        _mockCacheProvider.Verify(c => c.StreamAcknowledgeAsync("appointments_stream", "worker_group", messageId), Times.Once);
    }
}
