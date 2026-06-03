import { eq, and, isNull, count } from 'drizzle-orm';
import { db } from '@/infrastructure/db/client';
import { vehicles } from '@/infrastructure/db/schema';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';

export class DrizzleVehicleRepository implements IVehicleRepository {
  async create(data: Partial<Vehicle>): Promise<Vehicle> {
    const [result] = await db.insert(vehicles).values({
      tenantId: data.tenantId!,
      userId: data.userId!,
      make: data.make!,
      model: data.model!,
      year: data.year!,
      vin: data.vin,
      licensePlate: data.licensePlate,
    }).returning();
    return result as Vehicle;
  }

  async findById(tenantId: string, id: string): Promise<Vehicle | null> {
    const result = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)),
    });
    return (result as Vehicle) || null;
  }

  async findByUser(tenantId: string, userId: string): Promise<Vehicle[]> {
    const results = await db.query.vehicles.findMany({
      where: and(eq(vehicles.userId, userId), eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)),
    });
    return results as Vehicle[];
  }

  async findAll(tenantId: string | undefined, filters: { scope?: 'tenant' | 'mine'; userId?: string }, page: number = 1, pageSize: number = 20): Promise<{ data: Vehicle[]; total: number; page: number; pageSize: number }> {
    const conditions = [isNull(vehicles.deletedAt)];
    if (tenantId) {
      conditions.push(eq(vehicles.tenantId, tenantId));
    }
    if (filters.scope === 'mine' && filters.userId) {
      conditions.push(eq(vehicles.userId, filters.userId));
    }

    const totalResult = await db.select({ count: count() }).from(vehicles).where(and(...conditions));
    const total = totalResult[0].count;
    
    const offset = (page - 1) * pageSize;
    const results = await db.select().from(vehicles)
      .where(and(...conditions))
      .limit(pageSize)
      .offset(offset);

    return {
      data: results as Vehicle[],
      total,
      page,
      pageSize
    };
  }

  async update(tenantId: string, id: string, data: Partial<Vehicle>): Promise<Vehicle | null> {
    const [result] = await db.update(vehicles)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
      .returning();
    return (result as Vehicle) || null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const [result] = await db.update(vehicles)
      .set({ deletedAt: new Date() })
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
      .returning();
    return !!result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async hasActiveAppointments(tenantId: string, id: string): Promise<boolean> {
    return false;
  }
}
