import { ITenantRepository } from '@/application/ports/repositories/tenant.repository.port';
import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';

export class GetMyTenantsUseCase {
  constructor(private readonly userTenantRepo: IUserTenantRepository, private readonly tenantRepo: ITenantRepository) {}

  async execute(userId: string) {
    const userTenants = await this.userTenantRepo.findByUserId(userId);

    return Promise.all(userTenants.map(async (ut) => {
      const tenant = await this.tenantRepo.findById(ut.tenantId);
      return {
        userId: ut.userId,
        tenantId: ut.tenantId,
        tenantName: tenant?.name,
        role: ut.role,
        joinedAt: ut.createdAt,
      };
    }));
  }
}
