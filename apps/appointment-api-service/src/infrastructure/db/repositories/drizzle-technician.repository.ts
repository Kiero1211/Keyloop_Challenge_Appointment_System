import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../client';
import { technicians } from '../schema';
import { Technician } from '@/domain/entities/technician.entity';
import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';

export class DrizzleTechnicianRepository implements ITechnicianRepository {
  async create(data: Partial<Technician>): Promise<Technician> {
    const [result] = await db.insert(technicians).values({
      tenantId: data.tenantId!,
      firstName: data.firstName!,
      lastName: data.lastName!,
      email: data.email!,
    }).returning();
    return result as Technician;
  }

  async findById(tenantId: string, id: string): Promise<Technician | null> {
    const result = await db.query.technicians.findFirst({
      where: and(eq(technicians.id, id), eq(technicians.tenantId, tenantId), isNull(technicians.deletedAt)),
    });
    return (result as Technician) || null;
  }

  async findByEmail(tenantId: string, email: string): Promise<Technician | null> {
    const result = await db.query.technicians.findFirst({
      where: and(eq(technicians.email, email), eq(technicians.tenantId, tenantId), isNull(technicians.deletedAt)),
    });
    return (result as Technician) || null;
  }

  async findAll(tenantId: string): Promise<Technician[]> {
    const results = await db.query.technicians.findMany({
      where: and(eq(technicians.tenantId, tenantId), isNull(technicians.deletedAt)),
    });
    return results as Technician[];
  }

  async update(tenantId: string, id: string, data: Partial<Technician>): Promise<Technician | null> {
    const [result] = await db.update(technicians)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(technicians.id, id), eq(technicians.tenantId, tenantId), isNull(technicians.deletedAt)))
      .returning();
    return (result as Technician) || null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const [result] = await db.update(technicians)
      .set({ deletedAt: new Date() })
      .where(and(eq(technicians.id, id), eq(technicians.tenantId, tenantId), isNull(technicians.deletedAt)))
      .returning();
    return !!result;
  }
}
