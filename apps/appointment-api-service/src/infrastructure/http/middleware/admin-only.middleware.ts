import { Request, Response, NextFunction } from 'express';
import { ForbiddenException } from '../../../domain/exceptions';

export const adminOnlyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (!user) {
    throw new ForbiddenException('User not authenticated');
  }

  if (user.isSuperAdmin || user.role === 'Admin') {
    return next();
  }

  throw new ForbiddenException('Admin access required');
};
