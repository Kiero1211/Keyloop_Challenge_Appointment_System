import { ServiceBay } from '@/domain/entities/service-bay.entity';

export interface IServiceBayRepository {
  create(bay: Partial<ServiceBay>): Promise<ServiceBay>;
  findById(tenantId: string, id: string): Promise<ServiceBay | null>;
  findByName(tenantId: string, name: string): Promise<ServiceBay | null>;
  findAll(tenantId: string): Promise<ServiceBay[]>;
  update(tenantId: string, id: string, data: Partial<ServiceBay>): Promise<ServiceBay | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
}
