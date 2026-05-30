import { CreateTenantUseCase } from '../../../src/application/use-cases/crud/tenant/create-tenant.use-case';
import { ITenantRepository } from '../../../src/application/ports/repositories/tenant.repository.port';
import { ConflictException } from '../../../src/domain/exceptions';

describe('CreateTenantUseCase', () => {
  let useCase: CreateTenantUseCase;
  let mockRepo: jest.Mocked<ITenantRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };
    useCase = new CreateTenantUseCase(mockRepo);
  });

  it('should create tenant successfully', async () => {
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 't1', name: 'New Tenant' } as any);

    const result = await useCase.execute({ name: 'New Tenant' });
    expect(result.id).toBe('t1');
  });

  it('should throw ConflictException on duplicate name', async () => {
    mockRepo.findByName.mockResolvedValue({ id: 't1', name: 'Existing Tenant' } as any);

    await expect(useCase.execute({ name: 'Existing Tenant' })).rejects.toThrow(ConflictException);
  });
});
