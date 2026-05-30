import { CreateAppointmentUseCase } from '../../../../src/application/use-cases/create-appointment.use-case';
import { ICacheProvider } from '../../../../src/application/ports/cache-provider.port';
import { IMessagePublisher } from '../../../../src/application/ports/message-publisher.port';
import { CreateAppointmentCommand } from '../../../../src/application/commands/create-appointment.command';
import { tenantContext } from '../../../../src/domain/context/tenant-context';
import { DuplicateAppointmentException } from '../../../../src/domain/exceptions';

describe('CreateAppointmentUseCase', () => {
  let useCase: CreateAppointmentUseCase;
  let cacheProvider: jest.Mocked<ICacheProvider>;
  let messagePublisher: jest.Mocked<IMessagePublisher>;
  let partitionHasher: jest.Mock<number, [string, string]>;

  beforeEach(() => {
    cacheProvider = {
      exists: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      del: jest.fn(),
      ping: jest.fn(),
    };
    
    messagePublisher = {
      publish: jest.fn(),
    };

    partitionHasher = jest.fn().mockReturnValue(1);

    useCase = new CreateAppointmentUseCase(cacheProvider, messagePublisher, partitionHasher);
  });

  it('should process a valid appointment command successfully', () => {
    return tenantContext.run({ tenantId: 'tenant-123' }, async () => {
      const command: CreateAppointmentCommand = {
        customerId: 'cust-1',
        vehicleId: 'veh-1',
        serviceTypeId: 'srv-1',
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      cacheProvider.exists.mockResolvedValue(false);
      messagePublisher.publish.mockResolvedValue('msg-id-1');

      const result = await useCase.execute(command);

      expect(result.commandId).toBeDefined();
      expect(result.partition).toBe(1);
      
      expect(cacheProvider.exists).toHaveBeenCalledWith('tenant:tenant-123:appointment:veh-1:pending');
      expect(cacheProvider.hset).toHaveBeenCalledWith(
        'tenant:tenant-123:appointment:veh-1:pending', 
        expect.objectContaining({
          commandId: result.commandId,
          customerId: 'cust-1',
          vehicleId: 'veh-1'
        })
      );
      
      expect(messagePublisher.publish).toHaveBeenCalledWith(
        'appointments_stream_1',
        expect.objectContaining({
          commandId: result.commandId,
          tenantId: 'tenant-123',
          vehicleId: 'veh-1'
        })
      );
    });
  });

  it('should throw DuplicateAppointmentException if appointment hash already exists', () => {
    return tenantContext.run({ tenantId: 'tenant-123' }, async () => {
      const command: CreateAppointmentCommand = {
        customerId: 'cust-1',
        vehicleId: 'veh-1',
        serviceTypeId: 'srv-1',
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      cacheProvider.exists.mockResolvedValue(true);

      await expect(useCase.execute(command)).rejects.toThrow(DuplicateAppointmentException);
      expect(messagePublisher.publish).not.toHaveBeenCalled();
    });
  });
});
