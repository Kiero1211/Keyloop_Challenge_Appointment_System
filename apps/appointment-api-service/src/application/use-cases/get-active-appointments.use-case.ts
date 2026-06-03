import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { activeAppointmentsSetKey, appointmentHashKey } from '@/domain/cache-keys';

export interface ActiveAppointmentDto {
  id: string;
  tenantId: string;
  customerId: string;
  vehicleId: string;
  serviceTypeId: string;
  technicianId: string;
  serviceBayId: string;
  startTime: string;
  endTime: string;
  status: 'Pending' | 'Scheduled' | 'Failed';
  notes: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapHashToAppointment(hash: Record<string, string>): ActiveAppointmentDto {
  return {
    id: hash.id ?? '',
    tenantId: hash.tenant_id ?? '',
    customerId: hash.customer_id ?? '',
    vehicleId: hash.vehicle_id ?? '',
    serviceTypeId: hash.service_type_id ?? '',
    technicianId: hash.technician_id ?? '',
    serviceBayId: hash.service_bay_id ?? '',
    startTime: hash.start_time ?? '',
    endTime: hash.end_time ?? '',
    status: (hash.status as ActiveAppointmentDto['status']) ?? 'Pending',
    notes: hash.notes || null,
    actualStartTime: hash.actual_start_time || null,
    actualEndTime: hash.actual_end_time || null,
    createdAt: hash.created_at ?? '',
    updatedAt: hash.updated_at ?? '',
  };
}

export class GetActiveAppointmentsUseCase {
  constructor(private readonly cacheProvider: ICacheProvider) {}

  async execute(tenantId: string): Promise<ActiveAppointmentDto[]> {
    const appointmentIds = await this.cacheProvider.smembers(activeAppointmentsSetKey(tenantId));
    const appointments: ActiveAppointmentDto[] = [];

    for (const appointmentId of appointmentIds) {
      const hash = await this.cacheProvider.hgetall(appointmentHashKey(tenantId, appointmentId));
      if (!hash) continue;

      const appointment = mapHashToAppointment(hash);
      if (appointment.status !== 'Pending' && appointment.status !== 'Scheduled') continue;

      appointments.push(appointment);
    }

    return appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
}
