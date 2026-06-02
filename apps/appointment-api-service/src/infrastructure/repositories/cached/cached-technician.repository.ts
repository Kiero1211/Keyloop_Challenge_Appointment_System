import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Technician } from '@/domain/entities/technician.entity';
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

export class CachedTechnicianRepository implements ITechnicianRepository {
  private cacheWrapper: ReadThroughCacheWrapper<Technician>;

  constructor(
    private baseRepository: ITechnicianRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Technician>(cacheProvider, 'Technician', 3600);
  }

  async findById(tenantId: string, id: string): Promise<Technician | null> {
    const technician = await this.cacheWrapper.get(
      tenantId,
      id,
      () => this.baseRepository.findById(tenantId, id),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        isActive: record.isActive === 'true',
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as Technician)
    );
    return technician;
  }

  async findAll(tenantId: string): Promise<Technician[]> {
    return this.baseRepository.findAll(tenantId);
  }

  async create(technician: Technician): Promise<Technician> {
    return this.baseRepository.create(technician);
  }

  async update(tenantId: string, id: string, updates: Partial<Technician>): Promise<Technician | null> {
    const result = await this.baseRepository.update(tenantId, id, updates);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }

  async findByEmail(tenantId: string, email: string): Promise<Technician | null> {
    return this.baseRepository.findByEmail(tenantId, email);
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.baseRepository.softDelete(tenantId, id);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }
}
