import { ITenantRepository } from '../../../ports/repositories/tenant.repository.port';

export class DeactivateTenantUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(id: string): Promise<void> {
    await this.tenantRepository.deactivate(id);
  }
}
