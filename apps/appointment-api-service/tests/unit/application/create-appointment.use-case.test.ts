import { CreateAppointmentUseCase } from '@/application/use-cases/create-appointment.use-case';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { IMessagePublisher } from '@/application/ports/message-publisher.port';
import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { tenantContext } from '@/domain/context/tenant-context';
import { DomainValidationException, ConflictException } from '@/domain/exceptions';

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
      expire: jest.fn(),
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
    
    // mock cacheProvider.get to return valid holds
    cacheProvider.get.mockResolvedValueOnce(JSON.stringify({ holdId: 'h1', technicianId: 't1' }));
    cacheProvider.get.mockResolvedValueOnce(JSON.stringify({ holdId: 'h2', serviceBayId: 'b1' }));

    const input = {
      customerId: 'c1',
      vehicleId: 'v1',
      serviceTypeId: 'st1',
      technicianId: 't1',
      serviceBayId: 'b1',
      desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      autoAssigned: false,
      technicianHolId: 'h1',
      serviceBayHoldId: 'h2'
    };

    const result = await useCase.execute(input);

    expect(result.commandId).toBeDefined();
    expect(result.partition).toBe(0);
    expect(messagePublisher.publish).toHaveBeenCalled();
    expect(cacheProvider.hset).toHaveBeenCalled();
    expect(cacheProvider.deleteMultiple).toHaveBeenCalled();
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
