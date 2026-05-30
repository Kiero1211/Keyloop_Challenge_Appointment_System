export interface RefreshToken {
  id: string;
  userId: string;
  tenantId: string | null;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface IRefreshTokenRepository {
  create(token: Partial<RefreshToken>): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  revoke(token: string): Promise<boolean>;
  revokeAllForUser(userId: string): Promise<void>;
}
