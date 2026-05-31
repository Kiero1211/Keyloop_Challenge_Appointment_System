import { Request, Response, NextFunction } from 'express';
import { tenantContext } from '@/domain/context/tenant-context';
import crypto from 'crypto';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 'system';
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      tenantId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    }));
  });
  
  next();
}
