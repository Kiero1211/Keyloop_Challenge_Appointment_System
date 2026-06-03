import { ListVehiclesUseCase } from '@/application/use-cases/crud/vehicle/list-vehicles.use-case';
import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';

describe('ListVehiclesUseCase', () => {
  let useCase: ListVehiclesUseCase;
  let mockRepo: jest.Mocked<IVehicleRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveAppointments: jest.fn(),
    } as any;
    useCase = new ListVehiclesUseCase(mockRepo);
  });

  it('should scope TenantUser list to the signed-in user', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });

    await useCase.execute('tenant-1', 'mine', 'user-1', 1, 20);

    expect(mockRepo.findAll).toHaveBeenCalledWith('tenant-1', {
      scope: 'mine',
      userId: 'user-1',
    }, 1, 20);
  });
});
