import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/infrastructure/db/client';
import { customers } from '@/infrastructure/db/schema';
import { Customer } from '@/domain/entities/customer.entity';
import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';

export class DrizzleCustomerRepository implements ICustomerRepository {
  async create(data: Partial<Customer>): Promise<Customer> {
    const [result] = await db.insert(customers).values({
      tenantId: data.tenantId!,
      firstName: data.firstName!,
      lastName: data.lastName!,
      email: data.email!,
      phone: data.phone,
    }).returning();
    return result as Customer;
  }

  async findById(tenantId: string, id: string): Promise<Customer | null> {
    const result = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)),
    });
    return (result as Customer) || null;
  }

  async findAll(tenantId?: string, page: number = 1, pageSize: number = 20): Promise<{ data: Customer[]; total: number; page: number; pageSize: number }> {
    const { count } = await import('drizzle-orm');
    
    const conditions = [isNull(customers.deletedAt)];
    if (tenantId) {
      conditions.push(eq(customers.tenantId, tenantId));
    }

    const totalResult = await db.select({ count: count() }).from(customers).where(and(...conditions));
    const total = totalResult[0].count;
    
    const offset = (page - 1) * pageSize;
    const results = await db.select().from(customers)
      .where(and(...conditions))
      .limit(pageSize)
      .offset(offset);

    return {
      data: results as Customer[],
      total,
      page,
      pageSize
    };
  }

  async update(tenantId: string, id: string, data: Partial<Customer>): Promise<Customer | null> {
    const [result] = await db.update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)))
      .returning();
    return (result as Customer) || null;
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await db.update(customers)
      .set({ deletedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)));
  }

  async findByEmail(tenantId: string, email: string): Promise<Customer | null> {
    const result = await db.query.customers.findFirst({
      where: and(eq(customers.email, email), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)),
    });
    return (result as Customer) || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async hasActiveAppointments(tenantId: string, id: string): Promise<boolean> {
    return false; // placeholder implementation
  }
}
