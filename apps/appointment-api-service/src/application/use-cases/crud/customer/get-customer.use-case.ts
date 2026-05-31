import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { Customer } from '@/domain/entities/customer.entity';
import { NotFoundException } from '@/domain/exceptions';

export class GetCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(tenantId, id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
}
