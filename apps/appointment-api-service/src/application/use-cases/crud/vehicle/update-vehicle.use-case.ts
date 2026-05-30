import { IVehicleRepository } from '../../../ports/repositories/vehicle.repository.port';
import { Vehicle } from '../../../../domain/entities/vehicle.entity';
import { NotFoundException } from '../../../../domain/exceptions';

export class UpdateVehicleUseCase {
  constructor(private vehicleRepository: IVehicleRepository) {}

  async execute(tenantId: string, id: string, data: Partial<Omit<Vehicle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>): Promise<Vehicle> {
    const existing = await this.vehicleRepository.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException('Vehicle not found');
    }

    const updated = await this.vehicleRepository.update(tenantId, id, data);
    if (!updated) {
       throw new NotFoundException('Vehicle not found');
    }
    return updated;
  }
}
