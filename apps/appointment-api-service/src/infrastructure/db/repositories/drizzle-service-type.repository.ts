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

  async findAll(tenantId: string): Promise<ServiceType[]> {
    const results = await db.query.serviceTypes.findMany({
      where: and(eq(serviceTypes.tenantId, tenantId), isNull(serviceTypes.deletedAt)),
    });
    return results as ServiceType[];
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
