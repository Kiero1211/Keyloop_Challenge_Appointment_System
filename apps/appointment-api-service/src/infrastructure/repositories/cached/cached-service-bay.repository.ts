import { IServiceBayRepository } from '@/application/ports/repositories/service-bay.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { ServiceBay } from '@/domain/entities/service-bay.entity';
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

export class CachedServiceBayRepository implements IServiceBayRepository {
  private cacheWrapper: ReadThroughCacheWrapper<ServiceBay>;

  constructor(
    private baseRepository: IServiceBayRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<ServiceBay>(cacheProvider, 'ServiceBay', 3600);
  }

  async findById(tenantId: string, id: string): Promise<ServiceBay | null> {
    const serviceBay = await this.cacheWrapper.get(
      tenantId,
      id,
      () => this.baseRepository.findById(tenantId, id),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        name: record.name,
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as ServiceBay)
    );
    return serviceBay;
  }

  async findAll(tenantId?: string, page: number = 1, pageSize: number = 20): Promise<{ data: ServiceBay[]; total: number; page: number; pageSize: number }> {
    return this.baseRepository.findAll(tenantId, page, pageSize);
  }

  async create(serviceBay: ServiceBay): Promise<ServiceBay> {
    return this.baseRepository.create(serviceBay);
  }

  async update(tenantId: string, id: string, updates: Partial<ServiceBay>): Promise<ServiceBay | null> {
    const result = await this.baseRepository.update(tenantId, id, updates);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }

  async findByName(tenantId: string, name: string): Promise<ServiceBay | null> {
    return this.baseRepository.findByName(tenantId, name);
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.baseRepository.softDelete(tenantId, id);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }

  async findAvailable(tenantId: string, startTime: Date, endTime: Date): Promise<ServiceBay[]> {
    return this.baseRepository.findAvailable(tenantId, startTime, endTime);
  }
}
