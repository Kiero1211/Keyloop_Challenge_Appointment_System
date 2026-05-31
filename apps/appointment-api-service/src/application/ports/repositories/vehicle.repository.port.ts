import { Vehicle } from '@/domain/entities/vehicle.entity';

export interface IVehicleRepository {
  create(vehicle: Partial<Vehicle>): Promise<Vehicle>;
  findById(tenantId: string, id: string): Promise<Vehicle | null>;
  findByCustomer(tenantId: string, customerId: string): Promise<Vehicle[]>;
  update(tenantId: string, id: string, data: Partial<Vehicle>): Promise<Vehicle | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
  hasActiveAppointments(tenantId: string, id: string): Promise<boolean>;
}
