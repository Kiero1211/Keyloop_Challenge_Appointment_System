import { ITenantRepository } from '../../../ports/repositories/tenant.repository.port';
import { Tenant } from '../../../../domain/entities/tenant.entity';

export class ListTenantsUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(): Promise<Tenant[]> {
    return await this.tenantRepository.findAll();
  }
}
