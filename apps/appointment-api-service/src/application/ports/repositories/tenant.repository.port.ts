import { Tenant } from '@/domain/entities/tenant.entity';

export interface ITenantRepository {
  create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<Tenant>;
  findById(id: string): Promise<Tenant | null>;
  findByName(name: string): Promise<Tenant | null>;
  findAll(): Promise<Tenant[]>;
  update(id: string, data: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Tenant | null>;
  deactivate(id: string): Promise<void>;
}
