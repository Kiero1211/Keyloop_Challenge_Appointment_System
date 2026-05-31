import { Appointment } from '@/domain/entities/appointment.entity';

export interface IAppointmentCrudRepository {
  create(appointment: Partial<Appointment>): Promise<Appointment>;
  findById(tenantId: string, id: string): Promise<Appointment | null>;
  findDetailById(tenantId: string, id: string): Promise<Appointment | null>;
  findAll(tenantId: string, filters: {
    status?: string;
    technicianId?: string;
    serviceBayId?: string;
    serviceTypeId?: string;
    customerId?: string;
    vehicleId?: string;
    date?: string;
  }, page?: number, pageSize?: number): Promise<{ data: Appointment[], total: number }>;
  updateStatus(tenantId: string, id: string, status: string): Promise<Appointment | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
}
