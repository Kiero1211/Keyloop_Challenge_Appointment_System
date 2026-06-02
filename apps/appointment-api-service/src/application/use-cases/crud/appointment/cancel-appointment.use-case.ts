import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { NotFoundException, UnprocessableException } from '@/domain/exceptions';
import { Appointment } from '@/domain/entities/appointment.entity';

export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentCrudRepository
  ) {}

  async execute(tenantId: string, id: string): Promise<Appointment> {
    const existing = await this.appointmentRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Appointment not found');

    if (existing.status === 'Completed') {
      throw new UnprocessableException('Cannot cancel a completed appointment');
    }

    const updatedAppointment = await this.appointmentRepo.updateStatus(tenantId, id, 'Cancelled') as Appointment;

    return updatedAppointment;
  }
}
