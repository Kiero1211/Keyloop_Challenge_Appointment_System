import { RegisterUseCase } from '@/application/use-cases/auth/register.use-case';
import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';
import { ITenantRepository } from '@/application/ports/repositories/tenant.repository.port';
import { IRefreshTokenRepository } from '@/application/ports/repositories/refresh-token.repository.port';
import { ConflictException, NotFoundException } from '@/domain/exceptions';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockUserTenantRepo: jest.Mocked<IUserTenantRepository>;
  let mockTenantRepo: jest.Mocked<ITenantRepository>;
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
    mockTenantRepo = { create: jest.fn(), findById: jest.fn(), findByName: jest.fn(), findAll: jest.fn(), update: jest.fn(), deactivate: jest.fn() };
    mockRefreshTokenRepo = {
      create: jest.fn(),
      findByToken: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn()
    };
    mockJwtService = { generateAccessToken: jest.fn(), generateRefreshToken: jest.fn() };
    
    useCase = new RegisterUseCase(mockUserRepo, mockUserTenantRepo, mockTenantRepo, mockRefreshTokenRepo, mockJwtService);
  });

  it('should return 409 on duplicate email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: 'u1' } as any);
    await expect(useCase.execute({ email: 'test@example.com', password: 'password', firstName: 'Test', lastName: 'User' })).rejects.toThrow(ConflictException);
  });

  it('should return 404 if tenant not found', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockTenantRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ email: 'test@example.com', password: 'password', firstName: 'Test', lastName: 'User', tenantId: 'invalid' })).rejects.toThrow(NotFoundException);
  });
});
