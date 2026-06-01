import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { NotFoundException, UnprocessableException } from '@/domain/exceptions';
import { Appointment } from '@/domain/entities/appointment.entity';
import { ReadThroughCacheWrapper } from '@/infrastructure/cache/read-through-cache.wrapper';

export class CancelAppointmentUseCase {
  private cacheWrapper: ReadThroughCacheWrapper<Appointment>;

  constructor(
    private readonly appointmentRepo: IAppointmentCrudRepository,
    private readonly cacheProvider: ICacheProvider,
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Appointment>(cacheProvider, 'AppointmentDetail');
  }

  async execute(tenantId: string, id: string): Promise<Appointment> {
    const existing = await this.appointmentRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Appointment not found');

    if (existing.status === 'Completed') {
      throw new UnprocessableException('Cannot cancel a completed appointment');
    }

    const updatedAppointment = await this.appointmentRepo.updateStatus(tenantId, id, 'Cancelled') as Appointment;

    await this.cacheWrapper.invalidate(tenantId, id);

    return updatedAppointment;
  }
}
