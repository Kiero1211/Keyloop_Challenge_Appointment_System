import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { ConflictException } from '@/domain/exceptions';

export class DeleteVehicleUseCase {
  constructor(private vehicleRepository: IVehicleRepository) {}

  async execute(tenantId: string, id: string): Promise<void> {
    const hasAppointments = await this.vehicleRepository.hasActiveAppointments(tenantId, id);
    if (hasAppointments) {
      throw new ConflictException('Cannot delete vehicle with active appointments');
    }

    await this.vehicleRepository.softDelete(tenantId, id);
  }
}
