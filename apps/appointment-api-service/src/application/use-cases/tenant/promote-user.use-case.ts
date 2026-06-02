import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';
import { NotFoundException } from '@/domain/exceptions';

export class PromoteUserUseCase {
  constructor(
    private readonly userTenantRepository: IUserTenantRepository
  ) {}

  async execute(targetUserId: string, tenantId: string): Promise<void> {
    const existingLink = await this.userTenantRepository.findByUserAndTenant(targetUserId, tenantId);
    if (!existingLink) {
      throw new NotFoundException('User is not assigned to this tenant');
    }

    await this.userTenantRepository.updateRole(targetUserId, tenantId, 'TenantManager');
  }
}
