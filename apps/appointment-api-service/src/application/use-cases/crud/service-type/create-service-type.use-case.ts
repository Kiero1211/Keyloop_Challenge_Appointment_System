import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { ConflictException } from '@/domain/exceptions';
import { ServiceType } from '@/domain/entities/service-type.entity';

export class CreateServiceTypeUseCase {
  constructor(private readonly serviceTypeRepo: IServiceTypeRepository) {}

  async execute(tenantId: string, data: { name: string; estimatedDurationMinutes: number }): Promise<ServiceType> {
    const existing = await this.serviceTypeRepo.findByName(tenantId, data.name);
    if (existing) {
      throw new ConflictException(`Service type with name ${data.name} already exists`);
    }

    return this.serviceTypeRepo.create({
      tenantId,
      name: data.name,
      estimatedDurationMinutes: data.estimatedDurationMinutes,
    });
  }
}
