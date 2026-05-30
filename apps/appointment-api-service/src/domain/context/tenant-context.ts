export interface TenantContext {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

import { AsyncLocalStorage } from 'async_hooks';
export const tenantContext = new AsyncLocalStorage<TenantContext>();
