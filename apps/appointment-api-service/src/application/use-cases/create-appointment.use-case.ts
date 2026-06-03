import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { IMessagePublisher } from '@/application/ports/message-publisher.port';
import { CreateAppointmentCommand } from '@/application/commands/create-appointment.command';
import { tenantContext } from '@/domain/context/tenant-context';
import { DomainValidationException } from '@/domain/exceptions';
import { CommandId } from '@/domain/value-objects/command-id';
import { VehicleId } from '@/domain/value-objects/vehicle-id';
import { ServiceTypeId } from '@/domain/value-objects/service-type-id';
import { DesiredTime } from '@/domain/value-objects/desired-time';
import { v4 as uuidv4 } from 'uuid';

import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { activeAppointmentsSetKey, appointmentHashKey } from '@/domain/cache-keys';

export class CreateAppointmentUseCase {
  constructor(
    private readonly cacheProvider: ICacheProvider,
    private readonly messagePublisher: IMessagePublisher,
    private readonly serviceTypeRepository: IServiceTypeRepository,
    private readonly vehicleRepository: IVehicleRepository,
    private readonly userRepository: IUserRepository,
    private readonly partitionHasher: (tenantId: string, vehicleId: string) => number
  ) {}

  async execute(command: CreateAppointmentCommand) {
    const context = tenantContext.getStore();
    if (!context || !context.tenantId) {
      throw new DomainValidationException('Tenant context is missing');
    }

    const { tenantId, userId: signedInUserId, role } = context;
    
    const commandId = new CommandId(uuidv4());
    const vehicleId = new VehicleId(command.vehicleId);
    const serviceTypeId = new ServiceTypeId(command.serviceTypeId);
    const desiredStartTime = new DesiredTime(command.desiredStartTime);
    const resolvedUserId = command.userId || (role === 'TenantUser' ? signedInUserId : undefined);

    if (!resolvedUserId) {
      throw new DomainValidationException('userId is required for appointment creation');
    }

    if (role === 'TenantUser' && resolvedUserId !== signedInUserId) {
      throw new DomainValidationException('TenantUser can only create appointments for themselves');
    }

    const tenantUsers = await this.userRepository.findByTenantId(tenantId);
    const user = (tenantUsers ?? []).find(item => item.id === resolvedUserId);
    if (!user) {
      throw new DomainValidationException('User not found in active tenant');
    }

    const vehicle = await this.vehicleRepository.findById(tenantId, vehicleId.value);
    if (!vehicle || vehicle.userId !== resolvedUserId) {
      throw new DomainValidationException('Vehicle must belong to the selected user');
    }

    const serviceType = await this.serviceTypeRepository.findById(tenantId, serviceTypeId.value);
    if (!serviceType) {
      throw new DomainValidationException('ServiceType not found');
    }
    
    const scheduledEndTime = new Date(new Date(desiredStartTime.value).getTime() + serviceType.estimatedDurationMinutes * 60000);

    const partition = this.partitionHasher(tenantId, vehicleId.value);
    const streamName = `appointments_stream_${partition}`;

    const createdAt = new Date().toISOString();
    const payload = {
      commandId: commandId.value,
      appointmentId: commandId.value,
      tenantId,
      userId: resolvedUserId,
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
      user_id: resolvedUserId,
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

    return {
      commandId: commandId.value,
      partition
    };
  }
}
