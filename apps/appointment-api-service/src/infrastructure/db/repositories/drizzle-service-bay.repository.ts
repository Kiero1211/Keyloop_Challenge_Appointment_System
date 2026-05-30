import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../client';
import { serviceBays } from '../schema';
import { ServiceBay } from '@/domain/entities/service-bay.entity';
import { IServiceBayRepository } from '@/application/ports/repositories/service-bay.repository.port';

export class DrizzleServiceBayRepository implements IServiceBayRepository {
  async create(data: Partial<ServiceBay>): Promise<ServiceBay> {
    const [result] = await db.insert(serviceBays).values({
      tenantId: data.tenantId!,
      name: data.name!,
    }).returning();
    return result as ServiceBay;
  }

  async findById(tenantId: string, id: string): Promise<ServiceBay | null> {
    const result = await db.query.serviceBays.findFirst({
      where: and(eq(serviceBays.id, id), eq(serviceBays.tenantId, tenantId), isNull(serviceBays.deletedAt)),
    });
    return (result as ServiceBay) || null;
  }

  async findByName(tenantId: string, name: string): Promise<ServiceBay | null> {
    const result = await db.query.serviceBays.findFirst({
      where: and(eq(serviceBays.name, name), eq(serviceBays.tenantId, tenantId), isNull(serviceBays.deletedAt)),
    });
    return (result as ServiceBay) || null;
  }

  async findAll(tenantId: string): Promise<ServiceBay[]> {
    const results = await db.query.serviceBays.findMany({
      where: and(eq(serviceBays.tenantId, tenantId), isNull(serviceBays.deletedAt)),
    });
    return results as ServiceBay[];
  }

  async update(tenantId: string, id: string, data: Partial<ServiceBay>): Promise<ServiceBay | null> {
    const [result] = await db.update(serviceBays)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(serviceBays.id, id), eq(serviceBays.tenantId, tenantId), isNull(serviceBays.deletedAt)))
      .returning();
    return (result as ServiceBay) || null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const [result] = await db.update(serviceBays)
      .set({ deletedAt: new Date() })
      .where(and(eq(serviceBays.id, id), eq(serviceBays.tenantId, tenantId), isNull(serviceBays.deletedAt)))
      .returning();
    return !!result;
  }
}
