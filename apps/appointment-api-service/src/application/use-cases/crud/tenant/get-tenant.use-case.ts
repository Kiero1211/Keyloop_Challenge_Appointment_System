import { ITenantRepository } from '@/application/ports/repositories/tenant.repository.port';
import { Tenant } from '@/domain/entities/tenant.entity';
import { NotFoundException } from '@/domain/exceptions';

export class GetTenantUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }
}
