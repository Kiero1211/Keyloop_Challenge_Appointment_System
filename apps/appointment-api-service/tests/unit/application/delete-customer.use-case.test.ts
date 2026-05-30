import { DeleteCustomerUseCase } from '../../../src/application/use-cases/crud/customer/delete-customer.use-case';
import { ICustomerRepository } from '../../../src/application/ports/repositories/customer.repository.port';
import { ConflictException } from '../../../src/domain/exceptions';

describe('DeleteCustomerUseCase', () => {
  let useCase: DeleteCustomerUseCase;
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
    useCase = new DeleteCustomerUseCase(mockRepo);
  });

  it('should successfully delete customer when no active appointments', async () => {
    mockRepo.hasActiveAppointments.mockResolvedValue(false);

    await useCase.execute('t1', 'c1');
    expect(mockRepo.softDelete).toHaveBeenCalledWith('c1'); // Assuming we adjust the port to take tenantId or just id
  });

  it('should throw ConflictException when customer has active appointments', async () => {
    mockRepo.hasActiveAppointments.mockResolvedValue(true);

    await expect(
      useCase.execute('t1', 'c1')
    ).rejects.toThrow(ConflictException);
  });
});
