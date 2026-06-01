import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import { NotFoundException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '../../cache/read-through-cache.wrapper';

export class UpdateVehicleUseCase {
  private cacheWrapper: ReadThroughCacheWrapper<Vehicle>;

  constructor(
    private vehicleRepository: IVehicleRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Vehicle>(cacheProvider, 'Vehicle', 3600);
  }

  async execute(tenantId: string, id: string, data: Partial<Omit<Vehicle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>): Promise<Vehicle> {
    const existing = await this.vehicleRepository.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException('Vehicle not found');
    }

    const updated = await this.vehicleRepository.update(tenantId, id, data);
    
    // Invalidate cache
    await this.cacheWrapper.invalidate(tenantId, id);
    
    if (!updated) {
       throw new NotFoundException('Vehicle not found');
    }
    return updated;
  }
}
