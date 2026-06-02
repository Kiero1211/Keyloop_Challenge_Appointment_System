import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';
import { NotFoundException, ConflictException } from '@/domain/exceptions';

export class AssignGuestUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userTenantRepository: IUserTenantRepository
  ) {}

  async execute(targetUserId: string, tenantId: string): Promise<void> {
    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingLink = await this.userTenantRepository.findByUserAndTenant(targetUserId, tenantId);
    if (existingLink) {
      throw new ConflictException('User is already assigned to this tenant');
    }

    await this.userTenantRepository.create({
      userId: targetUserId,
      tenantId: tenantId,
      role: 'TenantUser',
      isActive: true,
    });
  }
}
