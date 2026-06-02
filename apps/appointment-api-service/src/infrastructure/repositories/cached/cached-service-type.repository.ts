import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { ServiceType } from '@/domain/entities/service-type.entity';
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

export class CachedServiceTypeRepository implements IServiceTypeRepository {
  private cacheWrapper: ReadThroughCacheWrapper<ServiceType>;

  constructor(
    private baseRepository: IServiceTypeRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<ServiceType>(cacheProvider, 'ServiceType', 3600);
  }

  async findById(tenantId: string, id: string): Promise<ServiceType | null> {
    const serviceType = await this.cacheWrapper.get(
      tenantId,
      id,
      () => this.baseRepository.findById(tenantId, id),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        name: record.name,
        estimatedDurationMinutes: parseInt(record.estimatedDurationMinutes as unknown as string, 10),
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as ServiceType)
    );
    return serviceType;
  }

  async findAll(tenantId?: string, page: number = 1, pageSize: number = 20): Promise<{ data: ServiceType[]; total: number; page: number; pageSize: number }> {
    return this.baseRepository.findAll(tenantId, page, pageSize);
  }

  async create(serviceType: ServiceType): Promise<ServiceType> {
    return this.baseRepository.create(serviceType);
  }

  async update(tenantId: string, id: string, updates: Partial<ServiceType>): Promise<ServiceType | null> {
    const result = await this.baseRepository.update(tenantId, id, updates);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }

  async findByName(tenantId: string, name: string): Promise<ServiceType | null> {
    return this.baseRepository.findByName(tenantId, name);
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.baseRepository.softDelete(tenantId, id);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }
}
