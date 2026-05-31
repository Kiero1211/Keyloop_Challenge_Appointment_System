import { DeleteServiceTypeUseCase } from '@/application/use-cases/crud/service-type/delete-service-type.use-case';
import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ConflictException, NotFoundException } from '@/domain/exceptions';

describe('DeleteServiceTypeUseCase', () => {
  let mockRepo: IServiceTypeRepository;
  let mockApptRepo: IAppointmentCrudRepository;
  let useCase: DeleteServiceTypeUseCase;

  beforeEach(() => {
    mockRepo = {
      softDelete: jest.fn(),
      findById: jest.fn(),
    } as unknown as IServiceTypeRepository;
    
    mockApptRepo = {
      findAll: jest.fn(),
    } as unknown as IAppointmentCrudRepository;
    
    useCase = new DeleteServiceTypeUseCase(mockRepo, mockApptRepo);
  });

  it('should delete service type when no active appointments', async () => {
    (mockRepo.findById as jest.Mock).mockResolvedValue({ id: '1', tenantId: 'tenant-1' });
    (mockApptRepo.findAll as jest.Mock).mockResolvedValue({ data: [], total: 0 });

    await useCase.execute('tenant-1', '1');
    expect(mockRepo.softDelete).toHaveBeenCalledWith('tenant-1', '1');
  });

  it('should throw ConflictException when referenced by active appointments', async () => {
    (mockRepo.findById as jest.Mock).mockResolvedValue({ id: '1', tenantId: 'tenant-1' });
    (mockApptRepo.findAll as jest.Mock).mockResolvedValue({ data: [{ id: 'app-1' }], total: 1 });

    await expect(useCase.execute('tenant-1', '1')).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException if not found', async () => {
    (mockRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('tenant-1', '1')).rejects.toThrow(NotFoundException);
  });
});
