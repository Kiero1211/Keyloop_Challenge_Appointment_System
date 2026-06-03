import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

export class CachedVehicleRepository implements IVehicleRepository {
  private cacheWrapper: ReadThroughCacheWrapper<Vehicle>;

  constructor(
    private baseRepository: IVehicleRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Vehicle>(cacheProvider, 'Vehicle', 3600);
  }

  async findById(tenantId: string, id: string): Promise<Vehicle | null> {
    const vehicle = await this.cacheWrapper.get(
      tenantId,
      id,
        () => this.baseRepository.findById(tenantId, id),
        (record) => ({
          id: record.id,
          tenantId: record.tenantId,
          userId: record.userId,
          make: record.make,
          model: record.model,
          year: parseInt(record.year as unknown as string, 10),
        licensePlate: record.licensePlate || undefined,
        vin: record.vin || undefined,
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as Vehicle)
    );
    return vehicle;
  }

  async findByUser(tenantId: string, userId: string): Promise<Vehicle[]> {
    return this.cacheWrapper.getList(
      tenantId,
      () => this.baseRepository.findByUser(tenantId, userId),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        userId: record.userId,
        make: record.make,
        model: record.model,
        year: parseInt(record.year as unknown as string, 10),
        licensePlate: record.licensePlate || undefined,
        vin: record.vin || undefined,
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as Vehicle),
      undefined,
      `tenant:${tenantId}:User:${userId}:Vehicles`
    );
  }

  async findAll(tenantId: string | undefined, filters: { scope?: 'tenant' | 'mine'; userId?: string }, page: number = 1, pageSize: number = 20): Promise<{ data: Vehicle[]; total: number; page: number; pageSize: number }> {
    return this.baseRepository.findAll(tenantId, filters, page, pageSize);
  }

  async create(vehicle: Vehicle): Promise<Vehicle> {
    return this.baseRepository.create(vehicle);
  }

  async update(tenantId: string, id: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
    const result = await this.baseRepository.update(tenantId, id, updates);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }

  async hasActiveAppointments(tenantId: string, id: string): Promise<boolean> {
    return this.baseRepository.hasActiveAppointments(tenantId, id);
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.baseRepository.softDelete(tenantId, id);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }
}
