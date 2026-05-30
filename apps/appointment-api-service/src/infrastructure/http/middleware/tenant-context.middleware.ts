import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from '../../../domain/context/tenant-context';

export const tenantContextStore = new AsyncLocalStorage<TenantContext>();

export const tenantContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantIdHeader = req.headers['x-tenant-id'] as string;
  
  if (!tenantIdHeader) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing x-tenant-id header' });
  }

  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
  }

  if (tenantIdHeader !== user.tenantId && !user.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
  }

  const context: TenantContext = {
    userId: user.userId,
    tenantId: tenantIdHeader,
    role: user.role,
    permissions: user.permissions || [],
    isSuperAdmin: user.isSuperAdmin || false,
  };

  tenantContextStore.run(context, () => {
    next();
  });
};

export const getTenantContext = (): TenantContext => {
  const context = tenantContextStore.getStore();
  if (!context) {
    throw new Error('Tenant context is not available outside of request lifecycle.');
  }
  return context;
};
