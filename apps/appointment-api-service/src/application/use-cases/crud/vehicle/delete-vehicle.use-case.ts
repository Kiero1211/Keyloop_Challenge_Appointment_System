import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';

export class DeleteVehicleUseCase {
  constructor(
    private vehicleRepository: IVehicleRepository
  ) {}

  async execute(tenantId: string, id: string): Promise<void> {
    await this.vehicleRepository.softDelete(tenantId, id);
  }
}
