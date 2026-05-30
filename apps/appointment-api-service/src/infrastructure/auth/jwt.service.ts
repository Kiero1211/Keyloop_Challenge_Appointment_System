import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  tenant_id: string;
  role: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export class JwtService {
  constructor(
    private readonly secret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshExpiresIn: string,
  ) {}

  generateAccessToken(payload: {
    userId: string;
    tenantId: string;
    role: string;
    permissions: string[];
    isSuperAdmin: boolean;
  }): string {
    const jwtPayload: JwtPayload = {
      sub: payload.userId,
      tenant_id: payload.tenantId,
      role: payload.role,
      permissions: payload.permissions,
      isSuperAdmin: payload.isSuperAdmin,
    };

    return jwt.sign(jwtPayload, this.secret, { expiresIn: this.accessExpiresIn });
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }
  generateRefreshToken(payload: { userId: string; tenantId: string }): string {
    return jwt.sign(
      { sub: payload.userId, tenant_id: payload.tenantId, isRefresh: true },
      this.secret,
      { expiresIn: this.refreshExpiresIn }
    );
  }

  verifyRefreshToken(token: string): { userId: string; tenantId: string } {
    const decoded = jwt.verify(token, this.secret) as any;
    if (!decoded.isRefresh) {
      throw new Error('Not a refresh token');
    }
    return { userId: decoded.sub, tenantId: decoded.tenant_id };
  }
}
