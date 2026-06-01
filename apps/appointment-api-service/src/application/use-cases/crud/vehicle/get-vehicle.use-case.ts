import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import { NotFoundException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '../../cache/read-through-cache.wrapper';

export class GetVehicleUseCase {
  private cacheWrapper: ReadThroughCacheWrapper<Vehicle>;

  constructor(
    private vehicleRepository: IVehicleRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Vehicle>(cacheProvider, 'Vehicle', 3600);
  }

  async execute(tenantId: string, id: string): Promise<Vehicle> {
    const vehicle = await this.cacheWrapper.get(
      tenantId,
      id,
      () => this.vehicleRepository.findById(tenantId, id),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        customerId: record.customerId,
        make: record.make,
        model: record.model,
        year: parseInt(record.year, 10),
        vin: record.vin || undefined,
        licensePlate: record.licensePlate || undefined,
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as Vehicle)
    );

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }
}
