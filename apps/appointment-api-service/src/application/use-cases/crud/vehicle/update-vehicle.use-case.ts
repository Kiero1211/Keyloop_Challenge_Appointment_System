import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import { tenantContext } from '@/domain/context/tenant-context';
import { NotFoundException } from '@/domain/exceptions';

export class UpdateVehicleUseCase {
  constructor(
    private vehicleRepository: IVehicleRepository
  ) {}

  async execute(tenantId: string, id: string, data: Partial<Omit<Vehicle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findById(tenantId, id);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const context = tenantContext.getStore();
    if (context?.role === 'TenantUser' && vehicle.userId !== context.userId) {
      throw new NotFoundException('Vehicle not found');
    }

    const updated = await this.vehicleRepository.update(tenantId, id, data);
    
    if (!updated) {
       throw new NotFoundException('Vehicle not found');
    }
    return updated;
  }
}
