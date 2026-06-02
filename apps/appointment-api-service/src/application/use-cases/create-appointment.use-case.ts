import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { IMessagePublisher } from '@/application/ports/message-publisher.port';
import { CreateAppointmentCommand } from '@/application/commands/create-appointment.command';
import { tenantContext } from '@/domain/context/tenant-context';
import { DomainValidationException, ConflictException } from '@/domain/exceptions';
import { CommandId } from '@/domain/value-objects/command-id';
import { CustomerId } from '@/domain/value-objects/customer-id';
import { VehicleId } from '@/domain/value-objects/vehicle-id';
import { ServiceTypeId } from '@/domain/value-objects/service-type-id';
import { DesiredTime } from '@/domain/value-objects/desired-time';
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

    // Validate hold
    const holdErrorMsg = 'The booking session has expired. Please re-create the booking session.';
    
    if (!command.technicianHolId || !command.serviceBayHoldId) {
      throw new ConflictException(holdErrorMsg);
    }

    const keysToDelete: string[] = [];

    if (command.technicianId) {
      const techKey = `tenant:${tenantId}:hold:technician:${command.technicianId}`;
      const techHoldStr = await this.cacheProvider.get(techKey);
      if (techHoldStr) {
        const techHold = JSON.parse(techHoldStr);
        if (techHold.holdId !== command.technicianHolId || techHold.technicianId !== command.technicianId) {
          throw new ConflictException("The selected technician is currently held by another user.");
        }
        keysToDelete.push(techKey);
      } else {
        throw new ConflictException(holdErrorMsg);
      }
    }

    if (command.serviceBayId) {
      const bayKey = `tenant:${tenantId}:hold:bay:${command.serviceBayId}`;
      const bayHoldStr = await this.cacheProvider.get(bayKey);
      if (bayHoldStr) {
        const bayHold = JSON.parse(bayHoldStr);
        if (bayHold.holdId !== command.serviceBayHoldId || bayHold.serviceBayId !== command.serviceBayId) {
          throw new ConflictException("The selected service bay is currently held by another user.");
        }
        keysToDelete.push(bayKey);
      } else {
        throw new ConflictException(holdErrorMsg);
      }
    }

    const partition = this.partitionHasher(tenantId, vehicleId.value);
    const streamName = `appointments_stream_${partition}`;

    // Compile message payload
    const payload = {
      commandId: commandId.value,
      tenantId,
      customerId: customerId.value,
      vehicleId: vehicleId.value,
      serviceTypeId: serviceTypeId.value,
      technicianId: command.technicianId,
      serviceBayId: command.serviceBayId,
      desiredStartTime: desiredStartTime.value,
      source: 'public',
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    };

    // Save tracking hash
    const idempotencyKey = `tenant:${tenantId}:appointment:${vehicleId.value}:Scheduled`;
    await this.cacheProvider.hset(idempotencyKey, payload);

    // Publish to stream
    await this.messagePublisher.publish(streamName, payload);

    // Delete holds
    if (keysToDelete.length > 0) {
      await this.cacheProvider.deleteMultiple(keysToDelete);
    }

    return {
      commandId: commandId.value,
      partition
    };
  }
}
