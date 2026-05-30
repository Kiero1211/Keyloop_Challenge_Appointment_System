import { IServiceTypeRepository } from '../../../ports/repositories/service-type.repository.port';
import { IAppointmentCrudRepository } from '../../../ports/repositories/appointment-crud.repository.port';
import { ConflictException, NotFoundException } from '../../../../domain/exceptions';

export class DeleteServiceTypeUseCase {
  constructor(
    private readonly serviceTypeRepo: IServiceTypeRepository,
    private readonly appointmentRepo: IAppointmentCrudRepository
  ) {}

  async execute(tenantId: string, id: string): Promise<void> {
    const existing = await this.serviceTypeRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(`Service type not found`);
    }

    const { total } = await this.appointmentRepo.findAll(tenantId, { serviceTypeId: id, limit: 1, offset: 0 });
    if (total > 0) {
      throw new ConflictException(`Cannot delete service type that is referenced by appointments`);
    }

    await this.serviceTypeRepo.softDelete(tenantId, id);
  }
}
