using AppointmentWorkerService.Core.Application.Validators;
using AppointmentWorkerService.Core.Domain.Entities;
using FluentValidation.TestHelper;

namespace AppointmentWorkerService.Tests.Unit.Application;

public class AppointmentMessageValidatorTests
{
    private readonly AppointmentMessageValidator _sut;

    public AppointmentMessageValidatorTests()
    {
        _sut = new AppointmentMessageValidator();
    }

    private AppointmentMessage CreateValidMessage() => new(
        TenantId: "tenant-123",
        VehicleId: "veh-123",
        CustomerId: "cust-123",
        ServiceTypeId: "svc-123",
        ServiceBayId: "bay-123",
        TechnicianId: "tech-123",
        DesiredStartTime: DateTimeOffset.UtcNow.AddDays(1),
        Source: "test"
    );

    [Fact]
    public void GivenNullTechnicianId_ThenValidationFails()
    {
        // Arrange
        var message = CreateValidMessage() with { TechnicianId = null };

        // Act
        var result = _sut.TestValidate(message);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.TechnicianId);
    }

    [Fact]
    public void GivenNullServiceBayId_ThenValidationFails()
    {
        // Arrange
        var message = CreateValidMessage() with { ServiceBayId = null };

        // Act
        var result = _sut.TestValidate(message);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.ServiceBayId);
    }

    [Fact]
    public void GivenAllFieldsPresent_ThenValidationPasses()
    {
        // Arrange
        var message = CreateValidMessage();

        // Act
        var result = _sut.TestValidate(message);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }
}
