import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { NotFoundException } from '@/domain/exceptions';

export class GetAppointmentDetailUseCase {
  constructor(private appointmentRepository: IAppointmentCrudRepository) {}

  async execute(tenantId: string, id: string) {
    const detail = await this.appointmentRepository.findDetailById(tenantId, id);
    if (!detail) {
      throw new NotFoundException('Appointment not found');
    }
    return detail;
  }
}
