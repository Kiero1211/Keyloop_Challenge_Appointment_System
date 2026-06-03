import { Vehicle } from '@/domain/entities/vehicle.entity';

export interface IVehicleRepository {
  create(vehicle: Partial<Vehicle>): Promise<Vehicle>;
  findById(tenantId: string, id: string): Promise<Vehicle | null>;
  findByUser(tenantId: string, userId: string): Promise<Vehicle[]>;
  findAll(tenantId: string | undefined, filters: { scope?: 'tenant' | 'mine'; userId?: string }, page?: number, pageSize?: number): Promise<{ data: Vehicle[]; total: number; page: number; pageSize: number }>;
  update(tenantId: string, id: string, data: Partial<Vehicle>): Promise<Vehicle | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
  hasActiveAppointments(tenantId: string, id: string): Promise<boolean>;
}
