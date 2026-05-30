import { ICustomerRepository } from '../../../ports/repositories/customer.repository.port';
import { Customer } from '../../../../domain/entities/customer.entity';
import { NotFoundException } from '../../../../domain/exceptions';

export class UpdateCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(tenantId: string, id: string, data: Partial<Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>): Promise<Customer> {
    const existing = await this.customerRepository.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.customerRepository.update(tenantId, id, data);
    if (!updated) {
       throw new NotFoundException('Customer not found');
    }
    return updated;
  }
}
