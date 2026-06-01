import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Appointment } from '@/domain/entities/appointment.entity';
import { UnprocessableException, NotFoundException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '../../cache/read-through-cache.wrapper';

export class UpdateAppointmentStatusUseCase {
  private cacheWrapper: ReadThroughCacheWrapper<any>;

  constructor(
    private appointmentRepository: IAppointmentCrudRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<any>(cacheProvider, 'AppointmentDetail');
  }

  async execute(tenantId: string, id: string, newStatus: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(tenantId, id);
    
    if (!appointment) {
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
    
    // Invalidate the detailed cache since status changed
    await this.cacheWrapper.invalidate(tenantId, id);

    return updated;
  }
}
