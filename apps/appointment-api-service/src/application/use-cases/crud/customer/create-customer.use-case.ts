import { ICustomerRepository } from '../../../ports/repositories/customer.repository.port';
import { Customer } from '../../../../domain/entities/customer.entity';
import { ConflictException } from '../../../../domain/exceptions';

export class CreateCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(tenantId: string, data: Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const existing = await this.customerRepository.findByEmail(tenantId, data.email);
    if (existing) {
      throw new ConflictException('Customer with this email already exists in this tenant');
    }
    
    return await this.customerRepository.create({
      tenantId,
      ...data
    });
  }
}
