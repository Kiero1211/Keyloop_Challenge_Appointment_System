import { ITenantRepository } from '@/application/ports/repositories/tenant.repository.port';
import { Tenant } from '@/domain/entities/tenant.entity';

export class ListTenantsUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(page: number = 1, pageSize: number = 20): Promise<{ data: Tenant[]; total: number; page: number; pageSize: number }> {
    return await this.tenantRepository.findAll(page, pageSize);
  }
}
