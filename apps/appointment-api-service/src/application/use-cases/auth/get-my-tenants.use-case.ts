import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';

export class GetMyTenantsUseCase {
  constructor(private readonly userTenantRepo: IUserTenantRepository) {}

  async execute(userId: string) {
    const userTenants = await this.userTenantRepo.findByUserId(userId);
    return userTenants.map((ut) => ({
      userId: ut.userId,
      tenantId: ut.tenantId,
      role: ut.role,
      joinedAt: ut.createdAt,
    }));
  }
}
