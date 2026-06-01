import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import { ConflictException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '../../cache/read-through-cache.wrapper';

export class DeleteVehicleUseCase {
  private cacheWrapper: ReadThroughCacheWrapper<Vehicle>;

  constructor(
    private vehicleRepository: IVehicleRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Vehicle>(cacheProvider, 'Vehicle', 3600);
  }

  async execute(tenantId: string, id: string): Promise<void> {
    const hasAppointments = await this.vehicleRepository.hasActiveAppointments(tenantId, id);
    if (hasAppointments) {
      throw new ConflictException('Cannot delete vehicle with active appointments');
    }

    await this.vehicleRepository.softDelete(tenantId, id);
    
    // Invalidate cache
    await this.cacheWrapper.invalidate(tenantId, id);
  }
}
