import { Customer } from '@/domain/entities/customer.entity';

export interface ICustomerRepository {
  create(customer: Partial<Customer>): Promise<Customer>;
  findById(tenantId: string, id: string): Promise<Customer | null>;
  findByEmail(tenantId: string, email: string): Promise<Customer | null>;
  findAll(tenantId?: string, page?: number, pageSize?: number): Promise<{ data: Customer[]; total: number; page: number; pageSize: number }>;
  update(tenantId: string, id: string, customer: Partial<Customer>): Promise<Customer | null>;
  softDelete(tenantId: string, id: string): Promise<void>;
  hasActiveAppointments(tenantId: string, id: string): Promise<boolean>;
}
