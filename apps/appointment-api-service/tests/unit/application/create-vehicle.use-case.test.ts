import { CreateVehicleUseCase } from '@/application/use-cases/crud/vehicle/create-vehicle.use-case';
import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { UnprocessableException } from '@/domain/exceptions';

describe('CreateVehicleUseCase', () => {
  let useCase: CreateVehicleUseCase;
  let mockVehicleRepo: jest.Mocked<IVehicleRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockVehicleRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveAppointments: jest.fn(),
    } as any;
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByTenantId: jest.fn(),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
    };
    useCase = new CreateVehicleUseCase(mockVehicleRepo, mockUserRepo);
  });

  it('should successfully create vehicle when userId belongs to same tenant', async () => {
    mockUserRepo.findByTenantId.mockResolvedValue([{ id: 'u1' }] as any);
    mockVehicleRepo.create.mockResolvedValue({ id: 'v1', tenantId: 't1' } as any);

    const result = await useCase.execute('t1', { userId: 'u1', licensePlate: 'ABC', make: 'Ford', model: 'Focus', year: 2020 });
    expect(result.id).toBe('v1');
  });

  it('should throw UnprocessableException when user does not belong to the tenant', async () => {
    mockUserRepo.findByTenantId.mockResolvedValue([]);

    await expect(
      useCase.execute('t1', { userId: 'u2', licensePlate: 'ABC', make: 'Ford', model: 'Focus', year: 2020 })
    ).rejects.toThrow(UnprocessableException);
  });
});
