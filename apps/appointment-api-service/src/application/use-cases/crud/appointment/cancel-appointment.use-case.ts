import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { NotFoundException, UnprocessableException } from '@/domain/exceptions';
import { Appointment } from '@/domain/entities/appointment.entity';
import { activeAppointmentsSetKey, appointmentHashKey, bayOccupiedKey, occupiedSlotHashKey, technicianOccupiedKey } from '@/domain/cache-keys';

export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentCrudRepository,
    private readonly cacheProvider: ICacheProvider
  ) {}

  async execute(tenantId: string, id: string): Promise<Appointment> {
    const existing = await this.appointmentRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Appointment not found');

    if (existing.status === 'Completed') {
      throw new UnprocessableException('Cannot cancel a completed appointment');
    }

    const updatedAppointment = await this.appointmentRepo.updateStatus(tenantId, id, 'Cancelled') as Appointment;

    await this.cacheProvider.srem(activeAppointmentsSetKey(tenantId), id);
    await this.cacheProvider.zrem(technicianOccupiedKey(tenantId, existing.technicianId), id);
    await this.cacheProvider.zrem(bayOccupiedKey(tenantId, existing.serviceBayId), id);
    await this.cacheProvider.del(occupiedSlotHashKey(tenantId, id));
    await this.cacheProvider.del(appointmentHashKey(tenantId, id));

    return updatedAppointment;
  }
}
