import { eq } from 'drizzle-orm';
import { db } from '../client';
import { users } from '../schema';
import { IUserRepository, User } from '../../../application/ports/repositories/user.repository.port';

export class DrizzleUserRepository implements IUserRepository {
  async create(user: Partial<User>): Promise<User> {
    const [created] = await db.insert(users).values(user as any).returning();
    return created as User;
  }

  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] ? (result[0] as User) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] ? (result[0] as User) : null;
  }

  async updateLastLogin(id: string, date: Date): Promise<void> {
    await db.update(users).set({ lastLoginAt: date }).where(eq(users.id, id));
  }
}
