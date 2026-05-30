import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { Customer } from '@/domain/entities/customer.entity';

export class ListCustomersUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(tenantId: string): Promise<Customer[]> {
    return await this.customerRepository.findAll(tenantId);
  }
}
