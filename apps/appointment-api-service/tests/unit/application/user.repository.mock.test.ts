import { IUserRepository } from '../../../src/application/ports/repositories/user.repository.port';

describe('IUserRepository Port', () => {
  it('should be mockable for finding by email', async () => {
    const mockRepo: IUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    const user = await mockRepo.findByEmail('test@example.com');
    expect(user?.email).toBe('test@example.com');
  });

  it('should be mockable for creation', async () => {
    const mockRepo: IUserRepository = {
      create: jest.fn().mockResolvedValue({ id: '2' }),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
    } as any;

    const user = await mockRepo.create({
      email: 'new@example.com',
      passwordHash: 'hash',
      firstName: 'New',
      lastName: 'User',
      role: 'TenantUser',
    });
    
    expect(user.id).toBe('2');
  });
});
