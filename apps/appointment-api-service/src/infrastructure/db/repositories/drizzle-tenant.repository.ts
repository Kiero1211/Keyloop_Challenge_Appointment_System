import { db } from '@/infrastructure/db/client';
import { tenants } from '@/infrastructure/db/schema';
import { ITenantRepository } from '@/application/ports/repositories/tenant.repository.port';
import { Tenant } from '@/domain/entities/tenant.entity';
import { eq, sql } from 'drizzle-orm';

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

  async findAll(page: number = 1, pageSize: number = 20): Promise<{ data: Tenant[]; total: number; page: number; pageSize: number }> {
    const [{ count }] = await db.select({ count: sql`count(*)` }).from(tenants);
    const results = await db
      .select()
      .from(tenants)
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      data: results as unknown as Tenant[],
      total: Number(count),
      page,
      pageSize,
    };
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
