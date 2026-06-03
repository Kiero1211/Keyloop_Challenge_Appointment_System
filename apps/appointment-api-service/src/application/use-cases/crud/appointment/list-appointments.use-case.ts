import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { tenantContext } from '@/domain/context/tenant-context';

export class ListAppointmentsUseCase {
  constructor(private appointmentRepository: IAppointmentCrudRepository) {}

  async execute(
    tenantId: string,
    scope: 'tenant' | 'mine' = 'tenant',
    userId: string | undefined = undefined,
    filters: any,
    page: number = 1,
    pageSize: number = 20
  ) {
    const context = tenantContext.getStore();
    const resolvedScope = context?.role === 'TenantUser' ? 'mine' : scope;
    const resolvedUserId = resolvedScope === 'mine' ? (userId || context?.userId) : undefined;
    return await this.appointmentRepository.findAll(tenantId, { ...filters, scope: resolvedScope, userId: resolvedUserId }, page, pageSize);
  }
}
