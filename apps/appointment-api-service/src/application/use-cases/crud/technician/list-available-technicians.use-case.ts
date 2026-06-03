import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
import { ITechnicianSkillRepository } from '@/application/ports/repositories/technician-skill.repository.port';
import { Technician } from '@/domain/entities/technician.entity';
import { tenantContext } from '@/domain/context/tenant-context';
import { DomainValidationException } from '@/domain/exceptions';

export class ListAvailableTechniciansUseCase {
  constructor(
    private readonly technicianRepository: ITechnicianRepository,
    private readonly technicianSkillRepository: ITechnicianSkillRepository
  ) {}

  async execute(startTime: string, endTime: string, serviceTypeId?: string): Promise<Technician[]> {
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

    const tenantId = context.tenantId;
    const availableTechnicians = await this.technicianRepository.findAvailable(tenantId, parsedStartTime, parsedEndTime);

    if (!serviceTypeId) {
      return availableTechnicians;
    }

    const requiredServiceTypeId = serviceTypeId;

    const qualifiedTechnicians = await Promise.all(
      availableTechnicians.map(async (technician) => {
        const hasSkill = await this.technicianSkillRepository.exists(tenantId, technician.id, requiredServiceTypeId);
        return hasSkill ? technician : null;
      })
    );

    return qualifiedTechnicians.filter((technician): technician is Technician => technician !== null);
  }
}
