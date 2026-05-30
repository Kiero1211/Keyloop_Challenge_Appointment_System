import { CreateServiceTypeUseCase } from '../../../src/application/use-cases/crud/service-type/create-service-type.use-case';
import { IServiceTypeRepository } from '../../../src/application/ports/repositories/service-type.repository.port';
import { ConflictException } from '../../../src/domain/exceptions';

describe('CreateServiceTypeUseCase', () => {
  let mockRepo: IServiceTypeRepository;
  let useCase: CreateServiceTypeUseCase;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as IServiceTypeRepository;
    useCase = new CreateServiceTypeUseCase(mockRepo);
  });

  it('should create service type successfully', async () => {
    (mockRepo.findByName as jest.Mock).mockResolvedValue(null);
    (mockRepo.create as jest.Mock).mockResolvedValue({ id: '1', name: 'Oil Change' });

    const result = await useCase.execute('tenant-1', { name: 'Oil Change', estimatedDurationMinutes: 30 });
    expect(result.id).toBe('1');
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oil Change', tenantId: 'tenant-1' }));
  });

  it('should throw ConflictException on duplicate name', async () => {
    (mockRepo.findByName as jest.Mock).mockResolvedValue({ id: '2', name: 'Oil Change' });

    await expect(useCase.execute('tenant-1', { name: 'Oil Change', estimatedDurationMinutes: 30 }))
      .rejects.toThrow(ConflictException);
  });
});
