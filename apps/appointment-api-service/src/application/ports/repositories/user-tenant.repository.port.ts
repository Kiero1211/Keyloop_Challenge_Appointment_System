export interface UserTenant {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserTenantRepository {
  create(userTenant: Partial<UserTenant>): Promise<UserTenant>;
  findByUserId(userId: string): Promise<UserTenant[]>;
  findByUserAndTenant(userId: string, tenantId: string): Promise<UserTenant | null>;
}
