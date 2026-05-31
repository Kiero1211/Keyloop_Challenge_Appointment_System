namespace AppointmentWorkerService.Core.Domain.Exceptions;

public class InvalidBookingRequestException : Exception
{
    public string DomainCode { get; } = "INVALID_BOOKING_REQUEST";

    public InvalidBookingRequestException(string reason)
        : base($"Booking request is invalid: {reason}")
    {
    }
}
