import { SwitchTenantUseCase } from '@/application/use-cases/auth/switch-tenant.use-case';
import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';
import { IRefreshTokenRepository } from '@/application/ports/repositories/refresh-token.repository.port';
import { UnauthorizedException } from '@/domain/exceptions';

describe('SwitchTenantUseCase', () => {
  let useCase: SwitchTenantUseCase;
  let mockUserTenantRepo: jest.Mocked<IUserTenantRepository>;
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepository>;
  let mockJwtService: any;

  beforeEach(() => {
    mockUserTenantRepo = { create: jest.fn(), findByUserId: jest.fn(), findByUserAndTenant: jest.fn() };
    mockRefreshTokenRepo = {
      create: jest.fn(),
      findByToken: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn()
    };
    mockJwtService = { generateAccessToken: jest.fn(), generateRefreshToken: jest.fn() };
    
    useCase = new SwitchTenantUseCase(mockUserTenantRepo, mockRefreshTokenRepo, mockJwtService);
  });

  it('should throw UnauthorizedException if not a member of target tenant', async () => {
    mockUserTenantRepo.findByUserAndTenant.mockResolvedValue(null);
    await expect(useCase.execute('u1', 't2', 'oldToken')).rejects.toThrow(UnauthorizedException);
  });
});
