import { eq, and } from 'drizzle-orm';
import { db } from '@/infrastructure/db/client';
import { userTenants } from '@/infrastructure/db/schema';
import { IUserTenantRepository, UserTenant } from '@/application/ports/repositories/user-tenant.repository.port';

export class DrizzleUserTenantRepository implements IUserTenantRepository {
  async create(userTenant: Partial<UserTenant>): Promise<UserTenant> {
    const [created] = await db.insert(userTenants).values(userTenant as any).returning();
    return created as UserTenant;
  }

  async findByUserId(userId: string): Promise<UserTenant[]> {
    const results = await db.select().from(userTenants).where(eq(userTenants.userId, userId));
    return results as UserTenant[];
  }

  async findByUserAndTenant(userId: string, tenantId: string): Promise<UserTenant | null> {
    const result = await db.select()
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
    return result[0] ? (result[0] as UserTenant) : null;
  }

  async updateRole(userId: string, tenantId: string, role: string): Promise<UserTenant> {
    const [updated] = await db.update(userTenants)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
      .returning();
    return updated as UserTenant;
  }
}
