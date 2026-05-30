export interface TenantContext {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  isSuperAdmin: boolean;
}
