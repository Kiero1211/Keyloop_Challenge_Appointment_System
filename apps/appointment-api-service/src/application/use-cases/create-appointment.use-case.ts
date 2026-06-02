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

import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { activeAppointmentsSetKey, appointmentHashKey } from '@/domain/cache-keys';

export class CreateAppointmentUseCase {
  constructor(
    private readonly cacheProvider: ICacheProvider,
    private readonly messagePublisher: IMessagePublisher,
    private readonly serviceTypeRepository: IServiceTypeRepository,
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

    // Fetch ServiceType to get estimatedDurationMinutes
    const serviceType = await this.serviceTypeRepository.findById(tenantId, serviceTypeId.value);
    if (!serviceType) {
      throw new DomainValidationException('ServiceType not found');
    }
    
    // Calculate scheduledEndTime
    const scheduledEndTime = new Date(new Date(desiredStartTime.value).getTime() + serviceType.estimatedDurationMinutes * 60000);

    // Validate hold
    const holdErrorMsg = 'The booking session has expired. Please re-create the booking session.';
    const keysToDelete: string[] = [];
    
    if (!command.autoAssigned) {
      if (!command.technicianHolId || !command.serviceBayHoldId) {
        throw new ConflictException(holdErrorMsg);
      }

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
    }

    const partition = this.partitionHasher(tenantId, vehicleId.value);
    const streamName = `appointments_stream_${partition}`;

    // Compile message payload
    const createdAt = new Date().toISOString();
    const payload = {
      commandId: commandId.value,
      appointmentId: commandId.value,
      tenantId,
      customerId: customerId.value,
      vehicleId: vehicleId.value,
      serviceTypeId: serviceTypeId.value,
      technicianId: command.technicianId,
      serviceBayId: command.serviceBayId,
      desiredStartTime: desiredStartTime.value,
      scheduledEndTime: scheduledEndTime.toISOString(),
      source: 'public',
      status: 'Pending',
      autoAssigned: command.autoAssigned,
      createdAt
    };

    // Publish to stream
    await this.messagePublisher.publish(streamName, payload);

    const appointmentId = commandId.value;
    const cacheKey = appointmentHashKey(tenantId, appointmentId);
    await this.cacheProvider.hset(cacheKey, {
      id: appointmentId,
      tenant_id: tenantId,
      customer_id: customerId.value,
      vehicle_id: vehicleId.value,
      service_type_id: serviceTypeId.value,
      technician_id: command.technicianId ?? '',
      service_bay_id: command.serviceBayId ?? '',
      start_time: desiredStartTime.value,
      end_time: scheduledEndTime.toISOString(),
      status: 'Pending',
      notes: '',
      actual_start_time: '',
      actual_end_time: '',
      created_at: createdAt,
      updated_at: createdAt,
    });
    await this.cacheProvider.sadd(activeAppointmentsSetKey(tenantId), [appointmentId]);

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
