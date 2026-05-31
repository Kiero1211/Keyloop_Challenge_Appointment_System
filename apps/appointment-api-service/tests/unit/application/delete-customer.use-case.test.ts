import { DeleteCustomerUseCase } from '@/application/use-cases/crud/customer/delete-customer.use-case';
import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { ConflictException } from '@/domain/exceptions';

describe('DeleteCustomerUseCase', () => {
  let useCase: DeleteCustomerUseCase;
  let mockRepo: jest.Mocked<ICustomerRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findByEmail: jest.fn(),
      hasActiveAppointments: jest.fn(),
    } as any;
    useCase = new DeleteCustomerUseCase(mockRepo);
  });

  it('should successfully delete customer when no active appointments', async () => {
    mockRepo.hasActiveAppointments.mockResolvedValue(false);

    await useCase.execute('t1', 'c1');
    expect(mockRepo.softDelete).toHaveBeenCalledWith('t1', 'c1');
  });

  it('should throw ConflictException when customer has active appointments', async () => {
    mockRepo.hasActiveAppointments.mockResolvedValue(true);

    await expect(
      useCase.execute('t1', 'c1')
    ).rejects.toThrow(ConflictException);
  });
});
