import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { tenantContext } from '@/domain/context/tenant-context';
import { NotFoundException } from '@/domain/exceptions';

export class GetAppointmentDetailUseCase {
  constructor(
    private appointmentRepository: IAppointmentCrudRepository
  ) {}

  async execute(tenantId: string, id: string) {
    const detail = await this.appointmentRepository.findDetailById(tenantId, id);
    if (!detail) {
      throw new NotFoundException('Appointment not found');
    }

    const context = tenantContext.getStore();
    const appointment = detail as { appointment?: { userId?: string }; userId?: string };
    const ownerUserId = appointment.appointment?.userId ?? appointment.userId;
    if (context?.role === 'TenantUser' && ownerUserId && ownerUserId !== context.userId) {
      throw new NotFoundException('Appointment not found');
    }

    return detail;
  }
}
