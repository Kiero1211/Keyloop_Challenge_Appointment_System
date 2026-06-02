import { Technician } from '@/domain/entities/technician.entity';

export interface ITechnicianRepository {
  create(technician: Partial<Technician>): Promise<Technician>;
  findById(tenantId: string, id: string): Promise<Technician | null>;
  findByEmail(tenantId: string, email: string): Promise<Technician | null>;
  findAll(tenantId?: string, page?: number, pageSize?: number): Promise<{ data: Technician[]; total: number; page: number; pageSize: number }>;
  update(tenantId: string, id: string, data: Partial<Technician>): Promise<Technician | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
  findAvailable(tenantId: string, startTime: Date, endTime: Date): Promise<Technician[]>;
}
