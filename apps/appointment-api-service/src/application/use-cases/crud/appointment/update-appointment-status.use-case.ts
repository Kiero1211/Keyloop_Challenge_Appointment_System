import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Appointment } from '@/domain/entities/appointment.entity';
import { tenantContext } from '@/domain/context/tenant-context';
import { UnprocessableException, NotFoundException } from '@/domain/exceptions';
import { activeAppointmentsSetKey, appointmentHashKey, bayOccupiedKey, occupiedSlotHashKey, technicianOccupiedKey } from '@/domain/cache-keys';

export class UpdateAppointmentStatusUseCase {
  constructor(
    private appointmentRepository: IAppointmentCrudRepository,
    private readonly cacheProvider: ICacheProvider
  ) {}

  async execute(tenantId: string, id: string, newStatus: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(tenantId, id);
    
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const context = tenantContext.getStore();
    if (context?.role === 'TenantUser' && appointment.userId !== context.userId) {
      throw new NotFoundException('Appointment not found');
    }

    const currentStatus = appointment.status;

    // Validate state machine
    // Scheduled -> InProgress -> Completed
    // Scheduled | InProgress -> Cancelled
    const validTransitions: Record<string, string[]> = {
      'Scheduled': ['InProgress', 'Cancelled'],
      'InProgress': ['Completed', 'Cancelled'],
      'Completed': [],
      'Cancelled': []
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new UnprocessableException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    const updated = await this.appointmentRepository.updateStatus(tenantId, id, newStatus as any);
    if (!updated) {
      throw new NotFoundException('Appointment not found during update');
    }

    if (newStatus === 'Completed' || newStatus === 'Cancelled') {
      await this.cacheProvider.srem(activeAppointmentsSetKey(tenantId), id);
      await this.cacheProvider.zrem(technicianOccupiedKey(tenantId, appointment.technicianId), id);
      await this.cacheProvider.zrem(bayOccupiedKey(tenantId, appointment.serviceBayId), id);
      await this.cacheProvider.del(occupiedSlotHashKey(tenantId, id));
      await this.cacheProvider.del(appointmentHashKey(tenantId, id));
    }

    return updated;
  }
}
