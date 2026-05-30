import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../client';
import { customers } from '../schema';
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

  async findAll(tenantId: string): Promise<Customer[]> {
    const results = await db.query.customers.findMany({
      where: and(eq(customers.tenantId, tenantId), isNull(customers.deletedAt)),
    });
    return results as Customer[];
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

  async hasActiveAppointments(tenantId: string, id: string): Promise<boolean> {
    return false; // placeholder implementation
  }
}
