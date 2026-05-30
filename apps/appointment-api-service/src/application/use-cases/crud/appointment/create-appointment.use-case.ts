import { IAppointmentCrudRepository } from '../../../ports/repositories/appointment-crud.repository.port';
import { ICustomerRepository } from '../../../ports/repositories/customer.repository.port';
import { IVehicleRepository } from '../../../ports/repositories/vehicle.repository.port';
import { IServiceTypeRepository } from '../../../ports/repositories/service-type.repository.port';
import { ITechnicianRepository } from '../../../ports/repositories/technician.repository.port';
import { IServiceBayRepository } from '../../../ports/repositories/service-bay.repository.port';
import { UnprocessableException } from '../../../../domain/exceptions';
import { Appointment } from '../../../../domain/entities/appointment.entity';

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentCrudRepository,
    private readonly customerRepo: ICustomerRepository,
    private readonly vehicleRepo: IVehicleRepository,
    private readonly serviceTypeRepo: IServiceTypeRepository,
    private readonly technicianRepo: ITechnicianRepository,
    private readonly serviceBayRepo: IServiceBayRepository
  ) {}

  async execute(tenantId: string, data: any): Promise<Appointment> {
    const customer = await this.customerRepo.findById(tenantId, data.customerId);
    const vehicle = await this.vehicleRepo.findById(tenantId, data.vehicleId);
    const serviceType = await this.serviceTypeRepo.findById(tenantId, data.serviceTypeId);
    const tech = await this.technicianRepo.findById(tenantId, data.technicianId);
    const bay = await this.serviceBayRepo.findById(tenantId, data.serviceBayId);

    if (!customer || !vehicle || !serviceType || !tech || !bay) {
      throw new UnprocessableException('One or more referenced entities not found');
    }

    if (
      customer.tenantId !== tenantId ||
      vehicle.tenantId !== tenantId ||
      serviceType.tenantId !== tenantId ||
      tech.tenantId !== tenantId ||
      bay.tenantId !== tenantId
    ) {
      throw new UnprocessableException('Cross-tenant references are not allowed');
    }

    return this.appointmentRepo.create({
      tenantId,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      serviceTypeId: data.serviceTypeId,
      technicianId: data.technicianId,
      serviceBayId: data.serviceBayId,
      status: 'Scheduled',
      scheduledStartTime: new Date(data.scheduledStartTime),
      scheduledEndTime: new Date(data.scheduledEndTime),
      notes: data.notes,
    });
  }
}
