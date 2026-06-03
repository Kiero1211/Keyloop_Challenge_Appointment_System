import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import { tenantContext } from '@/domain/context/tenant-context';

export class ListVehiclesUseCase {
  constructor(private vehicleRepository: IVehicleRepository) {}

  async execute(
    tenantId: string | undefined,
    scope: 'tenant' | 'mine' = 'tenant',
    userId?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ data: Vehicle[]; total: number; page: number; pageSize: number }> {
    const context = tenantContext.getStore();
    const resolvedScope = context?.role === 'TenantUser' ? 'mine' : scope;
    const resolvedUserId = resolvedScope === 'mine' ? (userId || context?.userId) : undefined;
    return await this.vehicleRepository.findAll(tenantId, { scope: resolvedScope, userId: resolvedUserId }, page, pageSize);
  }
}
