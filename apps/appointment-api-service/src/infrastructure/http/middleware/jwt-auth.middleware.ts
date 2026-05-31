import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@/infrastructure/auth/jwt.service';

export const jwtAuthMiddleware = (jwtService: JwtService) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing token' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwtService.verifyAccessToken(token);
      (req as any).user = {
        userId: decoded.sub,
        tenantId: decoded.tenant_id,
        role: decoded.role,
        permissions: decoded.permissions,
        isSuperAdmin: decoded.isSuperAdmin,
      };
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  };
};
