import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import {
  activeAppointmentsSetKey,
  appointmentHashKey,
  bayOccupiedKey,
  occupiedSlotHashKey,
  technicianOccupiedKey,
} from '@/domain/cache-keys';

export class StartupSeedService {
  constructor(
    private readonly appointmentRepository: IAppointmentCrudRepository,
    private readonly cacheProvider: ICacheProvider,
  ) {}

  async seed(): Promise<void> {
    const pageSize = 200;
    let page = 1;

    while (true) {
      const result = await this.appointmentRepository.findAll(undefined, { status: 'Scheduled' }, page, pageSize);

      for (const appointment of result.data) {
        const appointmentId = appointment.id;
        const tenantId = appointment.tenantId;
        const startTime = appointment.scheduledStartTime instanceof Date ? appointment.scheduledStartTime.toISOString() : new Date(appointment.scheduledStartTime).toISOString();
        const endTime = appointment.scheduledEndTime instanceof Date ? appointment.scheduledEndTime.toISOString() : new Date(appointment.scheduledEndTime).toISOString();
        const timestamp = new Date(appointment.updatedAt ?? appointment.createdAt ?? appointment.scheduledStartTime).toISOString();

        await this.cacheProvider.hset(appointmentHashKey(tenantId, appointmentId), {
          id: appointmentId,
          tenant_id: tenantId,
          user_id: appointment.userId,
          vehicle_id: appointment.vehicleId,
          service_type_id: appointment.serviceTypeId,
          technician_id: appointment.technicianId,
          service_bay_id: appointment.serviceBayId,
          start_time: startTime,
          end_time: endTime,
          status: 'Scheduled',
          notes: appointment.notes ?? '',
          actual_start_time: appointment.actualStartTime ? new Date(appointment.actualStartTime).toISOString() : '',
          actual_end_time: appointment.actualEndTime ? new Date(appointment.actualEndTime).toISOString() : '',
          created_at: new Date(appointment.createdAt).toISOString(),
          updated_at: timestamp,
        });

        await this.cacheProvider.sadd(activeAppointmentsSetKey(tenantId), [appointmentId]);

        const score = Math.floor(new Date(startTime).getTime() / 1000);
        await this.cacheProvider.zadd(technicianOccupiedKey(tenantId, appointment.technicianId), score, appointmentId);
        await this.cacheProvider.zadd(bayOccupiedKey(tenantId, appointment.serviceBayId), score, appointmentId);

        await this.cacheProvider.hset(occupiedSlotHashKey(tenantId, appointmentId), {
          appointment_id: appointmentId,
          start_time: startTime,
          end_time: endTime,
        });
      }

      if (result.data.length < pageSize) {
        break;
      }

      page += 1;
    }
  }
}
