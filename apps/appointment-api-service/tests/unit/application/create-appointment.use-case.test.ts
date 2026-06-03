import { CreateAppointmentUseCase } from '@/application/use-cases/create-appointment.use-case';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { IMessagePublisher } from '@/application/ports/message-publisher.port';
import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { tenantContext } from '@/domain/context/tenant-context';
import { DomainValidationException } from '@/domain/exceptions';
import { activeAppointmentsSetKey, appointmentHashKey } from '@/domain/cache-keys';

jest.mock('@/domain/context/tenant-context', () => ({
  tenantContext: {
    getStore: jest.fn()
  }
}));

describe('CreateAppointmentUseCase', () => {
  let useCase: CreateAppointmentUseCase;
  let cacheProvider: jest.Mocked<ICacheProvider>;
  let messagePublisher: jest.Mocked<IMessagePublisher>;
  let serviceTypeRepository: jest.Mocked<IServiceTypeRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let vehicleRepository: jest.Mocked<IVehicleRepository>;
  let partitionHasher: jest.Mock;

  beforeEach(() => {
    cacheProvider = {
      exists: jest.fn(),
      get: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      del: jest.fn(),
      deleteMultiple: jest.fn(),
      ping: jest.fn(),
      setMultipleIfNotExists: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn(),
      expire: jest.fn(),
      zadd: jest.fn(),
      zrem: jest.fn(),
      zrangebyscore: jest.fn(),
      srem: jest.fn(),
    };

    messagePublisher = {
      publish: jest.fn()
    };

    serviceTypeRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn()
    };

    userRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByTenantId: jest.fn().mockResolvedValue([{ id: 'current-user' } as any]),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    vehicleRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveAppointments: jest.fn(),
    };

    partitionHasher = jest.fn().mockReturnValue(0);

    useCase = new CreateAppointmentUseCase(
      cacheProvider,
      messagePublisher,
      serviceTypeRepository,
      vehicleRepository,
      userRepository,
      partitionHasher
    );

    (tenantContext.getStore as jest.Mock).mockReturnValue({ tenantId: 'tenant-123', userId: 'current-user', role: 'TenantUser', isSuperAdmin: false, permissions: [] });
  });

  it('should automatically assign the signed-in user for TenantUser appointments', async () => {
    serviceTypeRepository.findById.mockResolvedValue({ id: 'st1', estimatedDurationMinutes: 60 } as any);
    vehicleRepository.findById.mockResolvedValue({
      id: 'v1',
      tenantId: 'tenant-123',
      userId: 'current-user',
    } as any);

    const input = {
      vehicleId: 'v1',
      serviceTypeId: 'st1',
      technicianId: 't1',
      serviceBayId: 'b1',
      desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      autoAssigned: false
    };

    const result = await useCase.execute(input);

    expect(result.commandId).toBeDefined();
    expect(result.partition).toBe(0);
    expect(messagePublisher.publish).toHaveBeenCalledWith(
      'appointments_stream_0',
      expect.objectContaining({
        appointmentId: result.commandId,
        userId: 'current-user',
        status: 'Pending',
      })
    );
    expect(cacheProvider.hset).toHaveBeenCalledWith(
      appointmentHashKey('tenant-123', result.commandId),
      expect.objectContaining({
        id: result.commandId,
        tenant_id: 'tenant-123',
        user_id: 'current-user',
        vehicle_id: 'v1',
        service_type_id: 'st1',
        technician_id: 't1',
        service_bay_id: 'b1',
        status: 'Pending',
      })
    );
    expect(cacheProvider.sadd).toHaveBeenCalledWith(
      activeAppointmentsSetKey('tenant-123'),
      [result.commandId]
    );
    expect(cacheProvider.deleteMultiple).not.toHaveBeenCalled();
  });

  it('should reject TenantManager/Admin appointments without a selected user', async () => {
    (tenantContext.getStore as jest.Mock).mockReturnValue({ tenantId: 'tenant-123', userId: 'manager-user', role: 'TenantManager', isSuperAdmin: false, permissions: [] });
    serviceTypeRepository.findById.mockResolvedValue({ id: 'st1', estimatedDurationMinutes: 60 } as any);

    await expect(useCase.execute({
      vehicleId: 'v1',
      serviceTypeId: 'st1',
      desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      autoAssigned: false
    })).rejects.toThrow(DomainValidationException);
  });

  it('should throw DomainValidationException if tenant context is missing', async () => {
    (tenantContext.getStore as jest.Mock).mockReturnValue(undefined);

    await expect(useCase.execute({
      vehicleId: 'v1',
      serviceTypeId: 'st1',
      desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      autoAssigned: true
    })).rejects.toThrow(DomainValidationException);
  });
});
