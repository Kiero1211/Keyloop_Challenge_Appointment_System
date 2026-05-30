import { IAppointmentCrudRepository } from '../../../ports/repositories/appointment-crud.repository.port';

export class ListAppointmentsUseCase {
  constructor(private appointmentRepository: IAppointmentCrudRepository) {}

  async execute(tenantId: string, filters: any, page: number = 1, pageSize: number = 20) {
    return await this.appointmentRepository.findAll(tenantId, filters, page, pageSize);
  }
}
