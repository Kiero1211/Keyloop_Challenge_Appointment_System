import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import { UnprocessableException } from '@/domain/exceptions';

export class CreateVehicleUseCase {
  constructor(
    private vehicleRepository: IVehicleRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(tenantId: string, data: Omit<Vehicle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    const tenantUsers = await this.userRepository.findByTenantId(tenantId);
    if (!tenantUsers.some(user => user.id === data.userId)) {
      throw new UnprocessableException('User does not belong to this tenant or does not exist');
    }

    return await this.vehicleRepository.create({
      tenantId,
      ...data
    });
  }
}
