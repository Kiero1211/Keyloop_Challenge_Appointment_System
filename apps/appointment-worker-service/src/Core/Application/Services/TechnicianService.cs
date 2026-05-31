using System;
using System.Threading;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Domain.Exceptions;

namespace AppointmentWorkerService.Core.Application.Services;

public class TechnicianService : ITechnicianService
{
    private readonly ITechnicianRepository _technicianRepository;
    private readonly ITechnicianSkillRepository _technicianSkillRepository;
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly Microsoft.Extensions.Logging.ILogger<TechnicianService> _logger;

    public TechnicianService(
        ITechnicianRepository technicianRepository,
        ITechnicianSkillRepository technicianSkillRepository,
        IAppointmentRepository appointmentRepository,
        Microsoft.Extensions.Logging.ILogger<TechnicianService> logger)
    {
        _technicianRepository = technicianRepository;
        _technicianSkillRepository = technicianSkillRepository;
        _appointmentRepository = appointmentRepository;
        _logger = logger;
    }

    public async Task ValidateAndCheckAvailabilityAsync(string technicianId, string serviceTypeId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct = default)
    {
        if (!await _technicianRepository.ExistsAsync(technicianId, ct))
        {
            _logger.LogWarning("InvalidBookingRequest: Technician {TechnicianId} not found.", technicianId);
            throw new InvalidBookingRequestException($"Technician {technicianId} not found.");
        }

        if (!await _technicianSkillRepository.HasSkillAsync(technicianId, serviceTypeId, ct))
        {
            _logger.LogWarning("InvalidBookingRequest: Technician {TechnicianId} lacks skill {ServiceTypeId}.", technicianId, serviceTypeId);
            throw new InvalidBookingRequestException($"Technician {technicianId} lacks skill {serviceTypeId}.");
        }

        if (await _appointmentRepository.HasTechnicianOverlapAsync(technicianId, startUtc, endUtc, ct))
        {
            _logger.LogWarning("ResourceCurrentlyOccupied: Technician {TechnicianId} is already occupied between {StartUtc} and {EndUtc}.", technicianId, startUtc, endUtc);
            throw new ResourceCurrentlyOccupiedException($"Technician {technicianId} is already occupied.", startUtc, endUtc);
        }
    }
}
