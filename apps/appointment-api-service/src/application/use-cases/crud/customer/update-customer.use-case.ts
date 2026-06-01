import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Customer } from '@/domain/entities/customer.entity';
import { NotFoundException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '../../cache/read-through-cache.wrapper';

export class UpdateCustomerUseCase {
  private cacheWrapper: ReadThroughCacheWrapper<Customer>;

  constructor(
    private customerRepository: ICustomerRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Customer>(cacheProvider, 'Customer', 3600);
  }

  async execute(tenantId: string, id: string, data: Partial<Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>): Promise<Customer> {
    const customer = await this.customerRepository.findById(tenantId, id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.customerRepository.update(tenantId, id, data);
    
    // Invalidate cache
    await this.cacheWrapper.invalidate(tenantId, id);
    
    if (!updated) {
       throw new NotFoundException('Customer not found');
    }
    return updated;
  }
}
