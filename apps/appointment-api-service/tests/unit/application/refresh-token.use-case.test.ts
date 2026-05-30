import { RefreshTokenUseCase } from '../../../src/application/use-cases/auth/refresh-token.use-case';
import { IRefreshTokenRepository } from '../../../src/application/ports/repositories/refresh-token.repository.port';
import { UnauthorizedException } from '../../../src/domain/exceptions';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepository>;
  let mockJwtService: any;

  beforeEach(() => {
    mockRefreshTokenRepo = { create: jest.fn(), findByToken: jest.fn(), revoke: jest.fn() };
    mockJwtService = { generateAccessToken: jest.fn(), generateRefreshToken: jest.fn(), verifyRefreshToken: jest.fn() };
    
    useCase = new RefreshTokenUseCase(mockRefreshTokenRepo, mockJwtService);
  });

  it('should fail if token is revoked', async () => {
    mockJwtService.verifyRefreshToken.mockReturnValue({ userId: 'u1', tenantId: 't1' });
    mockRefreshTokenRepo.findByToken.mockResolvedValue({ token: 'xyz', isRevoked: true } as any);

    await expect(useCase.execute('xyz')).rejects.toThrow(UnauthorizedException);
  });
});
