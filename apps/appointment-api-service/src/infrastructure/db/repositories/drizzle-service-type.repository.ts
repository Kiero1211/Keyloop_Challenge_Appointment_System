import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/infrastructure/db/client';
import { serviceTypes } from '@/infrastructure/db/schema';
import { ServiceType } from '@/domain/entities/service-type.entity';
import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';

export class DrizzleServiceTypeRepository implements IServiceTypeRepository {
  async create(data: Partial<ServiceType>): Promise<ServiceType> {
    const [result] = await db.insert(serviceTypes).values({
      tenantId: data.tenantId!,
      name: data.name!,
      estimatedDurationMinutes: data.estimatedDurationMinutes!,
    }).returning();
    return result as ServiceType;
  }

  async findById(tenantId: string, id: string): Promise<ServiceType | null> {
    const result = await db.query.serviceTypes.findFirst({
      where: and(eq(serviceTypes.id, id), eq(serviceTypes.tenantId, tenantId), isNull(serviceTypes.deletedAt)),
    });
    return (result as ServiceType) || null;
  }

  async findByName(tenantId: string, name: string): Promise<ServiceType | null> {
    const result = await db.query.serviceTypes.findFirst({
      where: and(eq(serviceTypes.name, name), eq(serviceTypes.tenantId, tenantId), isNull(serviceTypes.deletedAt)),
    });
    return (result as ServiceType) || null;
  }

  async findAll(tenantId?: string, page: number = 1, pageSize: number = 20): Promise<{ data: ServiceType[]; total: number; page: number; pageSize: number }> {
    const { count } = await import('drizzle-orm');
    
    const conditions = [isNull(serviceTypes.deletedAt)];
    if (tenantId) {
      conditions.push(eq(serviceTypes.tenantId, tenantId));
    }

    const totalResult = await db.select({ count: count() }).from(serviceTypes).where(and(...conditions));
    const total = totalResult[0].count;
    
    const offset = (page - 1) * pageSize;
    const results = await db.select().from(serviceTypes)
      .where(and(...conditions))
      .limit(pageSize)
      .offset(offset);

    return {
      data: results as ServiceType[],
      total,
      page,
      pageSize
    };
  }

  async update(tenantId: string, id: string, data: Partial<ServiceType>): Promise<ServiceType | null> {
    const [result] = await db.update(serviceTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(serviceTypes.id, id), eq(serviceTypes.tenantId, tenantId), isNull(serviceTypes.deletedAt)))
      .returning();
    return (result as ServiceType) || null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const [result] = await db.update(serviceTypes)
      .set({ deletedAt: new Date() })
      .where(and(eq(serviceTypes.id, id), eq(serviceTypes.tenantId, tenantId), isNull(serviceTypes.deletedAt)))
      .returning();
    return !!result;
  }
}
