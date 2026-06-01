import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Customer } from '@/domain/entities/customer.entity';
import { NotFoundException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '../../cache/read-through-cache.wrapper';

export class GetCustomerUseCase {
  private cacheWrapper: ReadThroughCacheWrapper<Customer>;

  constructor(
    private customerRepository: ICustomerRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Customer>(cacheProvider, 'Customer', 3600);
  }

  async execute(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.cacheWrapper.get(
      tenantId,
      id,
      () => this.customerRepository.findById(tenantId, id),
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

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
}
