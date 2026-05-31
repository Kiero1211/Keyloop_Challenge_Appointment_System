import { CreateTechnicianUseCase } from '@/application/use-cases/crud/technician/create-technician.use-case';
import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
import { ConflictException } from '@/domain/exceptions';

describe('CreateTechnicianUseCase', () => {
  let mockRepo: ITechnicianRepository;
  let useCase: CreateTechnicianUseCase;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as ITechnicianRepository;
    useCase = new CreateTechnicianUseCase(mockRepo);
  });

  it('should create technician successfully', async () => {
    (mockRepo.findByEmail as jest.Mock).mockResolvedValue(null);
    (mockRepo.create as jest.Mock).mockResolvedValue({ id: '1', email: 'tech@test.com' });

    const result = await useCase.execute('tenant-1', { firstName: 'John', lastName: 'Doe', email: 'tech@test.com' });
    expect(result.id).toBe('1');
  });

  it('should throw ConflictException on duplicate email', async () => {
    (mockRepo.findByEmail as jest.Mock).mockResolvedValue({ id: '2', email: 'tech@test.com' });

    await expect(useCase.execute('tenant-1', { firstName: 'John', lastName: 'Doe', email: 'tech@test.com' }))
      .rejects.toThrow(ConflictException);
  });
});
