import { ITenantRepository } from '../../../ports/repositories/tenant.repository.port';
import { Tenant } from '../../../../domain/entities/tenant.entity';
import { ConflictException } from '../../../../domain/exceptions';

export class CreateTenantUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(data: { name: string }): Promise<Tenant> {
    const existing = await this.tenantRepository.findByName(data.name);
    if (existing) {
      throw new ConflictException('Tenant with this name already exists');
    }
    
    return await this.tenantRepository.create(data);
  }
}
