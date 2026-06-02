import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
import { Technician } from '@/domain/entities/technician.entity';
import { tenantContext } from '@/domain/context/tenant-context';
import { DomainValidationException } from '@/domain/exceptions';

export class ListAvailableTechniciansUseCase {
  constructor(private readonly technicianRepository: ITechnicianRepository) {}

  async execute(startTime: string, endTime: string): Promise<Technician[]> {
    const context = tenantContext.getStore();
    if (!context || !context.tenantId) {
      throw new DomainValidationException('Tenant context is missing');
    }

    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
      throw new DomainValidationException('Invalid start or end time format');
    }

    if (parsedStartTime >= parsedEndTime) {
      throw new DomainValidationException('Start time must be before end time');
    }

    return this.technicianRepository.findAvailable(context.tenantId, parsedStartTime, parsedEndTime);
  }
}
