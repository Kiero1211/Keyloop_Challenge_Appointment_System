import { SwitchTenantUseCase } from '@/application/use-cases/auth/switch-tenant.use-case';
import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';
import { IRefreshTokenRepository } from '@/application/ports/repositories/refresh-token.repository.port';
import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { UnauthorizedException } from '@/domain/exceptions';

describe('SwitchTenantUseCase', () => {
  let useCase: SwitchTenantUseCase;
  let mockUserTenantRepo: jest.Mocked<IUserTenantRepository>;
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockJwtService: any;

  beforeEach(() => {
    mockUserTenantRepo = { create: jest.fn(), findByUserId: jest.fn(), findByUserAndTenant: jest.fn(), updateRole: jest.fn() };
    mockRefreshTokenRepo = {
      create: jest.fn(),
      findByToken: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn()
    };
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByTenantId: jest.fn(),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
    };
    mockJwtService = { generateAccessToken: jest.fn(), generateRefreshToken: jest.fn() };
    
    useCase = new SwitchTenantUseCase(mockUserTenantRepo, mockRefreshTokenRepo, mockUserRepo, mockJwtService);
  });

  it('should throw UnauthorizedException if not a member of target tenant', async () => {
    mockUserRepo.findById.mockResolvedValue({ id: 'u1', isSuperAdmin: false } as any);
    mockUserTenantRepo.findByUserAndTenant.mockResolvedValue(null);
    await expect(useCase.execute('u1', 't2', 'oldToken')).rejects.toThrow(UnauthorizedException);
  });
});
