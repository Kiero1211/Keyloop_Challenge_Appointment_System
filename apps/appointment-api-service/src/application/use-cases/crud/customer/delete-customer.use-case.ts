import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Customer } from '@/domain/entities/customer.entity';
import { ConflictException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '../../cache/read-through-cache.wrapper';

export class DeleteCustomerUseCase {
  private cacheWrapper: ReadThroughCacheWrapper<Customer>;

  constructor(
    private customerRepository: ICustomerRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<Customer>(cacheProvider, 'Customer', 3600);
  }

  async execute(tenantId: string, id: string): Promise<void> {
    const hasAppointments = await this.customerRepository.hasActiveAppointments(tenantId, id);
    if (hasAppointments) {
      throw new ConflictException('Cannot delete customer with active appointments');
    }

    await this.customerRepository.softDelete(tenantId, id);
    
    // Invalidate cache
    await this.cacheWrapper.invalidate(tenantId, id);
  }
}
