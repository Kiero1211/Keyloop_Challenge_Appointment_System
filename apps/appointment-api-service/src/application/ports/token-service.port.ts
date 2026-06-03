export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface RefreshTokenPayload {
  userId: string;
  tenantId: string;
}

export interface ITokenService {
  generateAccessToken(payload: AccessTokenPayload): string;
  verifyAccessToken(token: string): unknown;
  generateRefreshToken(payload: RefreshTokenPayload): string;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}
