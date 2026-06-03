import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Appointment } from '@/domain/entities/appointment.entity';
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

export class CachedAppointmentCrudRepository implements IAppointmentCrudRepository {
  private cacheWrapper: ReadThroughCacheWrapper<any>;

  constructor(
    private baseRepository: IAppointmentCrudRepository,
    cacheProvider: ICacheProvider
  ) {
    this.cacheWrapper = new ReadThroughCacheWrapper<any>(cacheProvider, 'Appointment', -1);
  }

  async findDetailById(tenantId: string, id: string): Promise<any | null> {
    const detail = await this.cacheWrapper.get(
      tenantId,
      id,
      () => this.baseRepository.findDetailById(tenantId, id),
      (record) => {
        return {
          appointment: JSON.parse(record.appointment),
          user: record.user ? JSON.parse(record.user) : null,
          vehicle: record.vehicle ? JSON.parse(record.vehicle) : null,
          serviceType: record.serviceType ? JSON.parse(record.serviceType) : null,
          technician: record.technician ? JSON.parse(record.technician) : null,
          serviceBay: record.serviceBay ? JSON.parse(record.serviceBay) : null,
        };
      },
      (entity: any) => {
        if (!entity || !entity.appointment) return -1;
        const status = entity.appointment.status || entity.status;
        if (status === 'Completed' || status === 'Cancelled') {
          return 21600; // 6 hours
        }
        return -1; // -1 means no TTL
      }
    );
    return detail;
  }

  async findById(tenantId: string, id: string): Promise<Appointment | null> {
    return this.baseRepository.findById(tenantId, id);
  }

  async findAll(
    tenantId?: string,
    filters?: any,
    page?: number,
    pageSize?: number
  ): Promise<{ data: Appointment[]; total: number; page: number; pageSize: number }> {
    return this.baseRepository.findAll(tenantId, filters, page, pageSize);
  }

  async create(appointment: Appointment): Promise<Appointment> {
    return this.baseRepository.create(appointment);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string
  ): Promise<Appointment | null> {
    const result = await this.baseRepository.updateStatus(tenantId, id, status);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.baseRepository.softDelete(tenantId, id);
    if (result) {
      await this.cacheWrapper.invalidate(tenantId, id);
    }
    return result;
  }
}
