import { LoginUseCase } from '../../../src/application/use-cases/auth/login.use-case';
import { IUserRepository } from '../../../src/application/ports/repositories/user.repository.port';
import { IUserTenantRepository } from '../../../src/application/ports/repositories/user-tenant.repository.port';
import { IRefreshTokenRepository } from '../../../src/application/ports/repositories/refresh-token.repository.port';
import { UnauthorizedException } from '../../../src/domain/exceptions';
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
      update: jest.fn(),
      updateLastLogin: jest.fn()
    };
    mockUserTenantRepo = { create: jest.fn(), findByUserId: jest.fn(), findByUserAndTenant: jest.fn() };
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
    mockUserRepo.findByEmail.mockResolvedValue({ id: 'u1', passwordHash: 'hash', isActive: true } as any);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });
});
