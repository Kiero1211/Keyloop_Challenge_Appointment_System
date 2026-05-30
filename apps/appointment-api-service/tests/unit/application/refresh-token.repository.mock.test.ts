import { IRefreshTokenRepository } from '../../../src/application/ports/repositories/refresh-token.repository.port';

describe('IRefreshTokenRepository Port', () => {
  it('should be mockable', async () => {
    const mockRepo: IRefreshTokenRepository = {
      create: jest.fn().mockResolvedValue({ token: 'abc' }),
      findByToken: jest.fn().mockResolvedValue({ token: 'abc', isRevoked: false }),
      revoke: jest.fn().mockResolvedValue(true),
      revokeAllForUser: jest.fn(),
    };

    const created = await mockRepo.create({
      userId: '123',
      token: 'abc',
      expiresAt: new Date(),
    });
    expect(created.token).toBe('abc');

    const found = await mockRepo.findByToken('abc');
    expect(found?.isRevoked).toBe(false);

    await mockRepo.revoke('abc');
    expect(mockRepo.revoke).toHaveBeenCalledWith('abc');
  });
});
