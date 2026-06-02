import { IUserRepository } from '@/application/ports/repositories/user.repository.port';

export class ListTenantUsersUseCase {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async execute(tenantId: string) {
    return await this.userRepository.findByTenantId(tenantId);
  }
}
