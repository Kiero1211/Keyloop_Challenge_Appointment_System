import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { Customer } from '@/domain/entities/customer.entity';

export class ListCustomersUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(tenantId: string | undefined, page: number = 1, pageSize: number = 20): Promise<{ data: Customer[]; total: number; page: number; pageSize: number }> {
    return await this.customerRepository.findAll(tenantId, page, pageSize);
  }
}
