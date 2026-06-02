import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/infrastructure/db/client';
import { technicians } from '@/infrastructure/db/schema';
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

  async findAll(tenantId?: string, page: number = 1, pageSize: number = 20): Promise<{ data: Technician[]; total: number; page: number; pageSize: number }> {
    const { count } = await import('drizzle-orm');
    
    const conditions = [isNull(technicians.deletedAt)];
    if (tenantId) {
      conditions.push(eq(technicians.tenantId, tenantId));
    }

    const totalResult = await db.select({ count: count() }).from(technicians).where(and(...conditions));
    const total = totalResult[0].count;
    
    const offset = (page - 1) * pageSize;
    const results = await db.select().from(technicians)
      .where(and(...conditions))
      .limit(pageSize)
      .offset(offset);

    return {
      data: results as Technician[],
      total,
      page,
      pageSize
    };
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

  async findAvailable(tenantId: string, startTime: Date, endTime: Date): Promise<Technician[]> {
    const { appointments } = await import('@/infrastructure/db/schema');
    const { lt, gt, ne, notExists } = await import('drizzle-orm');

    const overlappingAppointments = db.select()
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.technicianId, technicians.id),
          ne(appointments.status, 'Cancelled'),
          lt(appointments.scheduledStartTime, endTime),
          gt(appointments.scheduledEndTime, startTime)
        )
      );

    const results = await db.select()
      .from(technicians)
      .where(
        and(
          eq(technicians.tenantId, tenantId),
          eq(technicians.isActive, true),
          isNull(technicians.deletedAt),
          notExists(overlappingAppointments)
        )
      );

    return results as Technician[];
  }
}
