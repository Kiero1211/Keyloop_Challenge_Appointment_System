import { CreateAppointmentUseCase } from '../../../src/application/use-cases/crud/appointment/create-appointment.use-case';
import { IAppointmentCrudRepository } from '../../../src/application/ports/repositories/appointment-crud.repository.port';
import { ICustomerRepository } from '../../../src/application/ports/repositories/customer.repository.port';
import { IVehicleRepository } from '../../../src/application/ports/repositories/vehicle.repository.port';
import { IServiceTypeRepository } from '../../../src/application/ports/repositories/service-type.repository.port';
import { ITechnicianRepository } from '../../../src/application/ports/repositories/technician.repository.port';
import { IServiceBayRepository } from '../../../src/application/ports/repositories/service-bay.repository.port';
import { UnprocessableException } from '../../../src/domain/exceptions';

describe('CreateAppointmentUseCase (CRUD)', () => {
  let mockApptRepo: IAppointmentCrudRepository;
  let mockCustomerRepo: ICustomerRepository;
  let mockVehicleRepo: IVehicleRepository;
  let mockServiceTypeRepo: IServiceTypeRepository;
  let mockTechRepo: ITechnicianRepository;
  let mockBayRepo: IServiceBayRepository;
  let useCase: CreateAppointmentUseCase;

  beforeEach(() => {
    mockApptRepo = { create: jest.fn() } as unknown as IAppointmentCrudRepository;
    mockCustomerRepo = { findById: jest.fn() } as unknown as ICustomerRepository;
    mockVehicleRepo = { findById: jest.fn() } as unknown as IVehicleRepository;
    mockServiceTypeRepo = { findById: jest.fn() } as unknown as IServiceTypeRepository;
    mockTechRepo = { findById: jest.fn() } as unknown as ITechnicianRepository;
    mockBayRepo = { findById: jest.fn() } as unknown as IServiceBayRepository;

    useCase = new CreateAppointmentUseCase(
      mockApptRepo,
      mockCustomerRepo,
      mockVehicleRepo,
      mockServiceTypeRepo,
      mockTechRepo,
      mockBayRepo
    );
  });

  it('should create an appointment', async () => {
    (mockCustomerRepo.findById as jest.Mock).mockResolvedValue({ id: 'c1', tenantId: 't1' });
    (mockVehicleRepo.findById as jest.Mock).mockResolvedValue({ id: 'v1', tenantId: 't1' });
    (mockServiceTypeRepo.findById as jest.Mock).mockResolvedValue({ id: 'st1', tenantId: 't1' });
    (mockTechRepo.findById as jest.Mock).mockResolvedValue({ id: 't1', tenantId: 't1' });
    (mockBayRepo.findById as jest.Mock).mockResolvedValue({ id: 'b1', tenantId: 't1' });
    (mockApptRepo.create as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Scheduled' });

    const result = await useCase.execute('t1', {
      customerId: 'c1',
      vehicleId: 'v1',
      serviceTypeId: 'st1',
      technicianId: 't1',
      serviceBayId: 'b1',
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(),
      notes: 'Test',
    });

    expect(result.id).toBe('a1');
    expect(mockApptRepo.create).toHaveBeenCalled();
  });

  it('should throw UnprocessableException if cross-tenant', async () => {
    (mockCustomerRepo.findById as jest.Mock).mockResolvedValue({ id: 'c1', tenantId: 't1' });
    (mockVehicleRepo.findById as jest.Mock).mockResolvedValue({ id: 'v1', tenantId: 't2' }); // Wrong tenant

    await expect(useCase.execute('t1', {
      customerId: 'c1',
      vehicleId: 'v1',
      serviceTypeId: 'st1',
      technicianId: 't1',
      serviceBayId: 'b1',
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(),
      notes: 'Test',
    })).rejects.toThrow(UnprocessableException);
  });
});
