import { Appointment } from '@/domain/entities/appointment.entity';

export interface IAppointmentCrudRepository {
  create(appointment: Partial<Appointment>): Promise<Appointment>;
  findById(tenantId: string, id: string): Promise<Appointment | null>;
  findDetailById(tenantId: string, id: string): Promise<Appointment | null>;
  findAll(tenantId: string | undefined, filters: { scope?: 'tenant' | 'mine'; userId?: string; date?: string; startTime?: string; endTime?: string; status?: string; technicianId?: string; serviceBayId?: string; vehicleId?: string; serviceTypeId?: string }, page?: number, pageSize?: number): Promise<{ data: Appointment[]; total: number; page: number; pageSize: number }>;
  updateStatus(tenantId: string, id: string, status: string): Promise<Appointment | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
}
