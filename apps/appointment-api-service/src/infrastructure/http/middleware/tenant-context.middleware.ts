import { Request, Response, NextFunction } from 'express';
import { tenantContext } from '../../../domain/context/tenant-context';

export const tenantContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing x-tenant-id header'
    });
  }

  tenantContext.run({ tenantId }, () => {
    next();
  });
};
