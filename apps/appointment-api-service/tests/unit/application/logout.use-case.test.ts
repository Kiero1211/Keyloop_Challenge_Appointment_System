import { LogoutUseCase } from '../../../src/application/use-cases/auth/logout.use-case';
import { IRefreshTokenRepository } from '../../../src/application/ports/repositories/refresh-token.repository.port';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepository>;

  beforeEach(() => {
    mockRefreshTokenRepo = {
      create: jest.fn(),
      findByToken: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn()
    };
    useCase = new LogoutUseCase(mockRefreshTokenRepo);
  });

  it('should revoke token', async () => {
    await useCase.execute('xyz');
    expect(mockRefreshTokenRepo.revoke).toHaveBeenCalledWith('xyz');
  });
});
