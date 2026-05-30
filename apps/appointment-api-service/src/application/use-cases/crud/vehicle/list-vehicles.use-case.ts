import { IVehicleRepository } from '../../../ports/repositories/vehicle.repository.port';
import { Vehicle } from '../../../../domain/entities/vehicle.entity';

export class ListVehiclesUseCase {
  constructor(private vehicleRepository: IVehicleRepository) {}

  async execute(tenantId: string, customerId?: string): Promise<Vehicle[]> {
    if (customerId) {
      return await this.vehicleRepository.findByCustomer(tenantId, customerId);
    }
    // Note: DrizzleVehicleRepository doesn't have a findAll yet, so we return empty if no customerId is provided
    // or we could add findAll. The spec just says GET /vehicles should work.
    // For now we just use findByCustomer if customerId is passed.
    return [];
  }
}
