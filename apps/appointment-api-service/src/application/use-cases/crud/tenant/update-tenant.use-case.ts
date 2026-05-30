import { ITenantRepository } from '../../../ports/repositories/tenant.repository.port';
import { Tenant } from '../../../../domain/entities/tenant.entity';
import { NotFoundException } from '../../../../domain/exceptions';

export class UpdateTenantUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(id: string, data: Partial<{ name: string }>): Promise<Tenant> {
    const existing = await this.tenantRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.tenantRepository.update(id, data);
    if (!updated) {
       throw new NotFoundException('Tenant not found');
    }
    return updated;
  }
}
