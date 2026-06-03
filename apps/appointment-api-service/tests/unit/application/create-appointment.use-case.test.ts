import { CreateAppointmentUseCase } from '@/application/use-cases/create-appointment.use-case';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { IMessagePublisher } from '@/application/ports/message-publisher.port';
import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
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

    partitionHasher = jest.fn().mockReturnValue(0);

    useCase = new CreateAppointmentUseCase(
      cacheProvider,
      messagePublisher,
      serviceTypeRepository,
      partitionHasher
    );

    (tenantContext.getStore as jest.Mock).mockReturnValue({ tenantId: 'tenant-123' });
  });

  it('should successfully create an appointment when valid', async () => {
    serviceTypeRepository.findById.mockResolvedValue({ id: 'st1', estimatedDurationMinutes: 60 } as any);

    const input = {
      customerId: 'c1',
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
        status: 'Pending',
      })
    );
    expect(cacheProvider.hset).toHaveBeenCalledWith(
      appointmentHashKey('tenant-123', result.commandId),
      expect.objectContaining({
        id: result.commandId,
        tenant_id: 'tenant-123',
        customer_id: 'c1',
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

  it('should throw DomainValidationException if tenant context is missing', async () => {
    (tenantContext.getStore as jest.Mock).mockReturnValue(undefined);

    await expect(useCase.execute({
      customerId: 'c1',
      vehicleId: 'v1',
      serviceTypeId: 'st1',
      desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      autoAssigned: true
    })).rejects.toThrow(DomainValidationException);
  });
});
