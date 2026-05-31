import { IServiceBayRepository } from '@/application/ports/repositories/service-bay.repository.port';
import { ConflictException } from '@/domain/exceptions';
import { ServiceBay } from '@/domain/entities/service-bay.entity';

export class CreateServiceBayUseCase {
  constructor(private readonly serviceBayRepo: IServiceBayRepository) {}

  async execute(tenantId: string, data: { name: string }): Promise<ServiceBay> {
    const existing = await this.serviceBayRepo.findByName(tenantId, data.name);
    if (existing) {
      throw new ConflictException(`Service bay with name ${data.name} already exists`);
    }

    return this.serviceBayRepo.create({
      tenantId,
      name: data.name,
    });
  }
}
