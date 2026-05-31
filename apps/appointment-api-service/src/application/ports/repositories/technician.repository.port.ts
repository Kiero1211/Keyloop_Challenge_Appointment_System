import { Technician } from '@/domain/entities/technician.entity';

export interface ITechnicianRepository {
  create(technician: Partial<Technician>): Promise<Technician>;
  findById(tenantId: string, id: string): Promise<Technician | null>;
  findByEmail(tenantId: string, email: string): Promise<Technician | null>;
  findAll(tenantId: string): Promise<Technician[]>;
  update(tenantId: string, id: string, data: Partial<Technician>): Promise<Technician | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
}
