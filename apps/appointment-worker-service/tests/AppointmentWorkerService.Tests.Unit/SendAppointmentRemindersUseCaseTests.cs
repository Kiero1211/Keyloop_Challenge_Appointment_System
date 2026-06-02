using Moq;
using Xunit;
using FluentAssertions;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.UseCases;

namespace AppointmentWorkerService.Tests.Unit.Application.UseCases;

public class SendAppointmentRemindersUseCaseTests
{
    private readonly Mock<IAppointmentReminderRepository> _repositoryMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly SendAppointmentRemindersUseCase _sut;

    public SendAppointmentRemindersUseCaseTests()
    {
        _repositoryMock = new Mock<IAppointmentReminderRepository>();
        _emailServiceMock = new Mock<IEmailService>();
        _sut = new SendAppointmentRemindersUseCase(_repositoryMock.Object, _emailServiceMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSendEmailsAndRecordReminders_WhenRemindersAreDue()
    {
        // Arrange
        var tenantId = "tenant-1";
        var appointmentId = Guid.NewGuid();
        var dueReminders = new List<AppointmentReminderData>
        {
            new AppointmentReminderData
            {
                TenantId = tenantId,
                AppointmentId = appointmentId,
                AppointmentStartTime = DateTimeOffset.UtcNow.AddHours(24),
                CustomerEmail = "test@example.com",
                CustomerName = "John Doe",
                VehicleMake = "Toyota",
                VehicleModel = "Corolla",
                ReminderSent = false
            }
        };

        _repositoryMock.Setup(x => x.GetPendingRemindersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(dueReminders);

        // Act
        await _sut.ExecuteAsync(CancellationToken.None);

        // Assert
        _emailServiceMock.Verify(x => x.SendEmailAsync(
            "test@example.com",
            It.IsAny<string>(),
            It.Is<string>(s => s.Contains("John Doe") && s.Contains("Toyota") && s.Contains("Corolla")),
            It.IsAny<CancellationToken>()), Times.Once);

        _repositoryMock.Verify(x => x.AddReminderAsync(
            It.Is<AppointmentReminder>(r => r.AppointmentId == appointmentId && r.TenantId == tenantId),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
