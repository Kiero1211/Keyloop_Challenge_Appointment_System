import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { Vehicle } from '@/domain/entities/vehicle.entity';

export class ListVehiclesUseCase {
  constructor(private vehicleRepository: IVehicleRepository) {}

  async execute(tenantId: string | undefined, customerId?: string, page: number = 1, pageSize: number = 20): Promise<{ data: Vehicle[]; total: number; page: number; pageSize: number }> {
    if (customerId && tenantId) {
      const results = await this.vehicleRepository.findByCustomer(tenantId, customerId);
      return { data: results, total: results.length, page: 1, pageSize: results.length || 20 };
    }
    return await this.vehicleRepository.findAll(tenantId, page, pageSize);
  }
}
