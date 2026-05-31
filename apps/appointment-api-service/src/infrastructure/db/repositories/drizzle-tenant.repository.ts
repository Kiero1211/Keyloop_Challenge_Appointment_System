import { db } from '@/infrastructure/db/client';
import { tenants } from '@/infrastructure/db/schema';
import { ITenantRepository } from '@/application/ports/repositories/tenant.repository.port';
import { Tenant } from '@/domain/entities/tenant.entity';
import { eq } from 'drizzle-orm';

export class DrizzleTenantRepository implements ITenantRepository {
  async create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<Tenant> {
    const [result] = await db.insert(tenants).values(data).returning();
    return result as unknown as Tenant;
  }

  async findById(id: string): Promise<Tenant | null> {
    const result = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });
    return (result as unknown as Tenant) || null;
  }

  async findByName(name: string): Promise<Tenant | null> {
    const result = await db.query.tenants.findFirst({
      where: eq(tenants.name, name),
    });
    return (result as unknown as Tenant) || null;
  }

  async findAll(): Promise<Tenant[]> {
    const results = await db.select().from(tenants);
    return results as unknown as Tenant[];
  }

  async update(id: string, data: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Tenant | null> {
    const [result] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return (result as unknown as Tenant) || null;
  }

  async deactivate(id: string): Promise<void> {
    await db
      .update(tenants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tenants.id, id));
  }
}
