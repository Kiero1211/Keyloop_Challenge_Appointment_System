import { Customer } from '../../../domain/entities/customer.entity';

export interface ICustomerRepository {
  create(customer: Partial<Customer>): Promise<Customer>;
  findById(tenantId: string, id: string): Promise<Customer | null>;
  findAll(tenantId: string): Promise<Customer[]>;
  update(tenantId: string, id: string, data: Partial<Customer>): Promise<Customer | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
}
