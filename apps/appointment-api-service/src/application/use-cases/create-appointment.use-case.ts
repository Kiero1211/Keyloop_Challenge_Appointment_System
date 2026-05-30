import { ICacheProvider } from '../ports/cache-provider.port';
import { IMessagePublisher } from '../ports/message-publisher.port';
import { CreateAppointmentCommand } from '../commands/create-appointment.command';
import { tenantContext } from '../../domain/context/tenant-context';
import { DuplicateAppointmentException, DomainValidationException } from '../../domain/exceptions';
import { CommandId } from '../../domain/value-objects/command-id';
import { CustomerId } from '../../domain/value-objects/customer-id';
import { VehicleId } from '../../domain/value-objects/vehicle-id';
import { ServiceTypeId } from '../../domain/value-objects/service-type-id';
import { DesiredTime } from '../../domain/value-objects/desired-time';
import { v4 as uuidv4 } from 'uuid';

export class CreateAppointmentUseCase {
  constructor(
    private readonly cacheProvider: ICacheProvider,
    private readonly messagePublisher: IMessagePublisher,
    private readonly partitionHasher: (tenantId: string, vehicleId: string) => number
  ) {}

  async execute(command: CreateAppointmentCommand) {
    const context = tenantContext.getStore();
    if (!context || !context.tenantId) {
      throw new DomainValidationException('Tenant context is missing');
    }

    const { tenantId } = context;
    
    // Validate Value Objects
    const commandId = new CommandId(uuidv4());
    const customerId = new CustomerId(command.customerId);
    const vehicleId = new VehicleId(command.vehicleId);
    const serviceTypeId = new ServiceTypeId(command.serviceTypeId);
    const desiredStartTime = new DesiredTime(command.desiredStartTime);

    // Check for idempotency
    const idempotencyKey = `tenant:${tenantId}:appointment:${vehicleId.value}:pending`;
    const isPending = await this.cacheProvider.exists(idempotencyKey);
    
    if (isPending) {
      throw new DuplicateAppointmentException(vehicleId.value);
    }

    // Determine Partition
    const partition = this.partitionHasher(tenantId, vehicleId.value);
    const streamName = `appointments_stream_${partition}`;

    // Compile message payload
    const payload = {
      commandId: commandId.value,
      tenantId,
      customerId: customerId.value,
      vehicleId: vehicleId.value,
      serviceTypeId: serviceTypeId.value,
      desiredStartTime: desiredStartTime.value,
      source: 'public',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save tracking hash
    await this.cacheProvider.hset(idempotencyKey, payload);

    // Publish to stream
    await this.messagePublisher.publish(streamName, payload);

    return {
      commandId: commandId.value,
      partition
    };
  }
}
