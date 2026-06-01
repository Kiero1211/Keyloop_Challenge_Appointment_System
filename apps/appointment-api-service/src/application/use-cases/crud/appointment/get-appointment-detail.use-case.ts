import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { NotFoundException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '../../cache/read-through-cache.wrapper';

export class GetAppointmentDetailUseCase {
  private cacheWrapper: ReadThroughCacheWrapper<any>;

  constructor(
    private appointmentRepository: IAppointmentCrudRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<any>(cacheProvider, 'AppointmentDetail');
  }

  async execute(tenantId: string, id: string) {
    const detail = await this.cacheWrapper.get(
      tenantId,
      id,
      () => this.appointmentRepository.findDetailById(tenantId, id),
      (record) => {
        // Custom deserializer
        return {
          appointment: JSON.parse(record.appointment),
          customer: record.customer ? JSON.parse(record.customer) : null,
          vehicle: record.vehicle ? JSON.parse(record.vehicle) : null,
          serviceType: record.serviceType ? JSON.parse(record.serviceType) : null,
          technician: record.technician ? JSON.parse(record.technician) : null,
          serviceBay: record.serviceBay ? JSON.parse(record.serviceBay) : null,
        };
      },
      (entity) => {
        const status = entity.appointment.status;
        if (status === 'Completed' || status === 'Cancelled') {
          return 6 * 60 * 60; // 6 hours
        }
        return -1; // -1 means no TTL in Redis. We will update ReadThroughCacheWrapper to support it if needed.
      }
    );

    if (!detail) {
      throw new NotFoundException('Appointment not found');
    }
    return detail;
  }
}
