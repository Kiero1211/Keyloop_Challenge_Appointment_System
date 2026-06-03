import { LoginUseCase } from '@/application/use-cases/auth/login.use-case';
import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';
import { IRefreshTokenRepository } from '@/application/ports/repositories/refresh-token.repository.port';
import { UnauthorizedException } from '@/domain/exceptions';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockUserTenantRepo: jest.Mocked<IUserTenantRepository>;
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepository>;
  let mockJwtService: any;

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByTenantId: jest.fn(),
      update: jest.fn(),
      updateLastLogin: jest.fn()
    };
    mockUserTenantRepo = { create: jest.fn(), findByUserId: jest.fn(), findByUserAndTenant: jest.fn(), updateRole: jest.fn() };
    mockRefreshTokenRepo = {
      create: jest.fn(),
      findByToken: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn()
    };
    mockJwtService = { generateAccessToken: jest.fn(), generateRefreshToken: jest.fn() };
    
    useCase = new LoginUseCase(mockUserRepo, mockUserTenantRepo, mockRefreshTokenRepo, mockJwtService);
  });

  it('should fail with 401 on wrong password', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: 'u1', passwordHash: '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNO1234567890123456', isActive: true } as any);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });

  it('should accept plain-text seeded passwords temporarily', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: 'u1', passwordHash: 'password123', isActive: true, role: 'TenantUser', isSuperAdmin: false, firstName: 'Seed', lastName: 'User', email: 'seed@example.com', permissions: [] } as any);
    mockUserTenantRepo.findByUserId.mockResolvedValue([{ tenantId: 't1', role: 'TenantUser' } as any]);
    mockJwtService.generateAccessToken.mockReturnValue('access');
    mockJwtService.generateRefreshToken.mockReturnValue('refresh');
    mockRefreshTokenRepo.create.mockResolvedValue({} as any);

    const result = await useCase.execute({ email: 'seed@example.com', password: 'password123' });

    expect(result.accessToken).toBe('access');
    expect(result.refreshToken).toBe('refresh');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});
