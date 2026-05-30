import { IVehicleRepository } from '../../../ports/repositories/vehicle.repository.port';
import { ICustomerRepository } from '../../../ports/repositories/customer.repository.port';
import { Vehicle } from '../../../../domain/entities/vehicle.entity';
import { UnprocessableException } from '../../../../domain/exceptions';

export class CreateVehicleUseCase {
  constructor(
    private vehicleRepository: IVehicleRepository,
    private customerRepository: ICustomerRepository
  ) {}

  async execute(tenantId: string, data: Omit<Vehicle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    const customer = await this.customerRepository.findById(tenantId, data.customerId);
    if (!customer) {
      throw new UnprocessableException('Customer does not belong to this tenant or does not exist');
    }

    return await this.vehicleRepository.create({
      tenantId,
      ...data
    });
  }
}
