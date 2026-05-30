import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { userTenants } from '../schema';
import { IUserTenantRepository, UserTenant } from '../../../application/ports/repositories/user-tenant.repository.port';

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
}
