import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { ConflictException } from '@/domain/exceptions';

export class DeleteCustomerUseCase {
  constructor(
    private customerRepository: ICustomerRepository
  ) {}

  async execute(tenantId: string, id: string): Promise<void> {
    const hasAppointments = await this.customerRepository.hasActiveAppointments(tenantId, id);
    if (hasAppointments) {
      throw new ConflictException('Cannot delete customer with active appointments');
    }

    await this.customerRepository.softDelete(tenantId, id);
  }
}
