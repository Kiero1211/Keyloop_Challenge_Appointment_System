import { CreateVehicleUseCase } from '../../../src/application/use-cases/crud/vehicle/create-vehicle.use-case';
import { IVehicleRepository } from '../../../src/application/ports/repositories/vehicle.repository.port';
import { ICustomerRepository } from '../../../src/application/ports/repositories/customer.repository.port';
import { UnprocessableException } from '../../../src/domain/exceptions';

describe('CreateVehicleUseCase', () => {
  let useCase: CreateVehicleUseCase;
  let mockVehicleRepo: jest.Mocked<IVehicleRepository>;
  let mockCustomerRepo: jest.Mocked<ICustomerRepository>;

  beforeEach(() => {
    mockVehicleRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCustomer: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveAppointments: jest.fn(),
    };
    mockCustomerRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveAppointments: jest.fn(),
    };
    useCase = new CreateVehicleUseCase(mockVehicleRepo, mockCustomerRepo);
  });

  it('should successfully create vehicle when customerId belongs to same tenant', async () => {
    mockCustomerRepo.findById.mockResolvedValue({ id: 'c1', tenantId: 't1' } as any);
    mockVehicleRepo.create.mockResolvedValue({ id: 'v1', tenantId: 't1' } as any);

    const result = await useCase.execute('t1', { customerId: 'c1', licensePlate: 'ABC', make: 'Ford', model: 'Focus', year: 2020 });
    expect(result.id).toBe('v1');
  });

  it('should throw UnprocessableException when customer belongs to different tenant', async () => {
    mockCustomerRepo.findById.mockResolvedValue(null); // findById uses tenant context, so it returns null if cross-tenant

    await expect(
      useCase.execute('t1', { customerId: 'c2', licensePlate: 'ABC', make: 'Ford', model: 'Focus', year: 2020 })
    ).rejects.toThrow(UnprocessableException);
  });
});
