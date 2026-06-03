import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { tenantContext } from '@/domain/context/tenant-context';
import { ForbiddenException, NotFoundException } from '@/domain/exceptions';

export class ListTenantUsersUseCase {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async execute(tenantId: string) {
    const context = tenantContext.getStore();
    if (!context || !context.tenantId) {
      throw new NotFoundException('Tenant context is missing');
    }

    if (context.role !== 'TenantManager' && context.role !== 'Admin' && !context.isSuperAdmin) {
      throw new ForbiddenException('Only TenantManager or Admin can list tenant users');
    }

    return await this.userRepository.findByTenantId(tenantId);
  }
}
