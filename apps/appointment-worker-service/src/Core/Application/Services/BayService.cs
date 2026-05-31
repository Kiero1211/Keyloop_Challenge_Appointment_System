using System;
using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Domain.Exceptions;

namespace AppointmentWorkerService.Core.Application.Services;

public class BayService : IBayService
{
    private readonly IServiceBayRepository _bayRepository;
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly Microsoft.Extensions.Logging.ILogger<BayService> _logger;

    public BayService(
        IServiceBayRepository bayRepository,
        IAppointmentRepository appointmentRepository,
        Microsoft.Extensions.Logging.ILogger<BayService> logger)
    {
        _bayRepository = bayRepository;
        _appointmentRepository = appointmentRepository;
        _logger = logger;
    }

    public async Task ValidateAndCheckAvailabilityAsync(string serviceBayId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct = default)
    {
        if (!await _bayRepository.ExistsAsync(serviceBayId, ct))
        {
            _logger.LogWarning("InvalidBookingRequest: Service bay {ServiceBayId} not found.", serviceBayId);
            throw new InvalidBookingRequestException($"Service bay {serviceBayId} not found.");
        }

        if (await _appointmentRepository.HasBayOverlapAsync(serviceBayId, startUtc, endUtc, ct))
        {
            _logger.LogWarning("ResourceCurrentlyOccupied: Service bay {ServiceBayId} is already occupied between {StartUtc} and {EndUtc}.", serviceBayId, startUtc, endUtc);
            throw new ResourceCurrentlyOccupiedException($"Service bay {serviceBayId} is already occupied.", startUtc, endUtc);
        }
    }
}
