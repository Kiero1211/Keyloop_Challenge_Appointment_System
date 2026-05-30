import { IAppointmentCrudRepository } from '../../../ports/repositories/appointment-crud.repository.port';
import { Appointment } from '../../../../domain/entities/appointment.entity';
import { UnprocessableException, NotFoundException } from '../../../../domain/exceptions';

export class UpdateAppointmentStatusUseCase {
  constructor(private appointmentRepository: IAppointmentCrudRepository) {}

  async execute(tenantId: string, id: string, newStatus: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(tenantId, id);
    
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const currentStatus = appointment.status;

    // Validate state machine
    // PENDING -> CONFIRMED -> COMPLETED
    // PENDING | CONFIRMED -> CANCELLED
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new UnprocessableException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    return await this.appointmentRepository.updateStatus(tenantId, id, newStatus as any);
  }
}
