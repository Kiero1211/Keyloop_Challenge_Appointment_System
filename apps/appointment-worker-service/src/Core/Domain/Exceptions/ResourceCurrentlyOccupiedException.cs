namespace AppointmentWorkerService.Core.Domain.Exceptions;

public class ResourceCurrentlyOccupiedException : Exception
{
    public string DomainCode { get; } = "RESOURCE_CURRENTLY_OCCUPIED";

    public ResourceCurrentlyOccupiedException(string resourceId, DateTimeOffset start, DateTimeOffset end)
        : base($"Resource {resourceId} is occupied for the requested timeslot [{start}, {end})")
    {
    }
}
