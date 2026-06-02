import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Customer } from '@/domain/entities/customer.entity';
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

export class CachedCustomerRepository implements ICustomerRepository {
  private cacheWrapper: ReadThroughCacheWrapper<Customer>;

  constructor(
    private baseRepository: ICustomerRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Customer>(cacheProvider, 'Customer', 3600);
  }

  async findById(tenantId: string, id: string): Promise<Customer | null> {
    const customer = await this.cacheWrapper.get(
      tenantId,
      id,
      () => this.baseRepository.findById(tenantId, id),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone || undefined,
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as Customer)
    );
    return customer;
  }

  async findAll(tenantId: string): Promise<Customer[]> {
    return this.cacheWrapper.getList(
      tenantId,
      () => this.baseRepository.findAll(tenantId),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone || undefined,
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as Customer)
    );
  }

  async findByEmail(tenantId: string, email: string): Promise<Customer | null> {
    return this.baseRepository.findByEmail(tenantId, email);
  }

  async create(customer: Customer): Promise<Customer> {
    return this.baseRepository.create(customer);
  }

  async update(tenantId: string, id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const result = await this.baseRepository.update(tenantId, id, updates);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.baseRepository.softDelete(tenantId, id);
    await this.cacheWrapper.invalidate(tenantId, id);
  }

  async hasActiveAppointments(tenantId: string, id: string): Promise<boolean> {
    return this.baseRepository.hasActiveAppointments(tenantId, id);
  }
}
