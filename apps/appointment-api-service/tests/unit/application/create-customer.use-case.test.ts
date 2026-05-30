import { CreateCustomerUseCase } from '../../../src/application/use-cases/crud/customer/create-customer.use-case';
import { ICustomerRepository } from '../../../src/application/ports/repositories/customer.repository.port';
import { ConflictException } from '../../../src/domain/exceptions';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let mockRepo: jest.Mocked<ICustomerRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveAppointments: jest.fn(),
    };
    useCase = new CreateCustomerUseCase(mockRepo);
  });

  it('should successfully create customer when email is unique', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 'c1', tenantId: 't1', email: 'test@example.com' } as any);

    const result = await useCase.execute('t1', { firstName: 'John', lastName: 'Doe', email: 'test@example.com' });
    expect(result.id).toBe('c1');
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't1', email: 'test@example.com' }));
  });

  it('should throw ConflictException on duplicate email within tenant', async () => {
    mockRepo.findByEmail.mockResolvedValue({ id: 'c1', tenantId: 't1', email: 'test@example.com' } as any);

    await expect(
      useCase.execute('t1', { firstName: 'John', lastName: 'Doe', email: 'test@example.com' })
    ).rejects.toThrow(ConflictException);
  });
});
