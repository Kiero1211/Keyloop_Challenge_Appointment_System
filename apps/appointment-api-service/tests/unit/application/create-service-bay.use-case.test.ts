import { CreateServiceBayUseCase } from '@/application/use-cases/crud/service-bay/create-service-bay.use-case';
import { IServiceBayRepository } from '@/application/ports/repositories/service-bay.repository.port';
import { ConflictException } from '@/domain/exceptions';

describe('CreateServiceBayUseCase', () => {
  let mockRepo: IServiceBayRepository;
  let useCase: CreateServiceBayUseCase;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as IServiceBayRepository;
    useCase = new CreateServiceBayUseCase(mockRepo);
  });

  it('should create bay successfully', async () => {
    (mockRepo.findByName as jest.Mock).mockResolvedValue(null);
    (mockRepo.create as jest.Mock).mockResolvedValue({ id: '1', name: 'Bay 1' });

    const result = await useCase.execute('tenant-1', { name: 'Bay 1' });
    expect(result.id).toBe('1');
  });

  it('should throw ConflictException on duplicate name', async () => {
    (mockRepo.findByName as jest.Mock).mockResolvedValue({ id: '2', name: 'Bay 1' });

    await expect(useCase.execute('tenant-1', { name: 'Bay 1' }))
      .rejects.toThrow(ConflictException);
  });
});
