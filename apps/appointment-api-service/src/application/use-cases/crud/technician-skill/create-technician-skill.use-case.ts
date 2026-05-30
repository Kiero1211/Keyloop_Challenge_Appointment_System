import { ITechnicianSkillRepository } from '@/application/ports/repositories/technician-skill.repository.port';
import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { ConflictException, UnprocessableException } from '@/domain/exceptions';
import { TechnicianSkill } from '@/domain/entities/technician-skill.entity';

export class CreateTechnicianSkillUseCase {
  constructor(
    private readonly skillRepo: ITechnicianSkillRepository,
    private readonly techRepo: ITechnicianRepository,
    private readonly serviceTypeRepo: IServiceTypeRepository
  ) {}

  async execute(tenantId: string, data: { technicianId: string; serviceTypeId: string }): Promise<TechnicianSkill> {
    const tech = await this.techRepo.findById(tenantId, data.technicianId);
    if (!tech) throw new UnprocessableException('Technician not found');

    const serviceType = await this.serviceTypeRepo.findById(tenantId, data.serviceTypeId);
    if (!serviceType) throw new UnprocessableException('Service Type not found');

    if (tech.tenantId !== tenantId || serviceType.tenantId !== tenantId) {
      throw new UnprocessableException('Cross-tenant references are not allowed');
    }

    const exists = await this.skillRepo.exists(tenantId, data.technicianId, data.serviceTypeId);
    if (exists) {
      throw new ConflictException('Technician already has this skill');
    }

    return this.skillRepo.create({
      tenantId,
      technicianId: data.technicianId,
      serviceTypeId: data.serviceTypeId,
    });
  }
}
