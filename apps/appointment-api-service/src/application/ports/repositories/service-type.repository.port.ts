import { ServiceType } from '@/domain/entities/service-type.entity';

export interface IServiceTypeRepository {
  create(serviceType: Partial<ServiceType>): Promise<ServiceType>;
  findById(tenantId: string, id: string): Promise<ServiceType | null>;
  findByName(tenantId: string, name: string): Promise<ServiceType | null>;
  findAll(tenantId: string): Promise<ServiceType[]>;
  update(tenantId: string, id: string, data: Partial<ServiceType>): Promise<ServiceType | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
}
