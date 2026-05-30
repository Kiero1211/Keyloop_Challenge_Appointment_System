import { eq } from 'drizzle-orm';
import { db } from '../client';
import { refreshTokens } from '../schema';
import { IRefreshTokenRepository, RefreshToken } from '../../../application/ports/repositories/refresh-token.repository.port';

export class DrizzleRefreshTokenRepository implements IRefreshTokenRepository {
  async create(token: Partial<RefreshToken>): Promise<RefreshToken> {
    const [created] = await db.insert(refreshTokens).values(token as any).returning();
    return created as RefreshToken;
  }

  async findByToken(tokenStr: string): Promise<RefreshToken | null> {
    const result = await db.select().from(refreshTokens).where(eq(refreshTokens.token, tokenStr));
    return result[0] ? (result[0] as RefreshToken) : null;
  }

  async revoke(tokenStr: string): Promise<boolean> {
    const result = await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.token, tokenStr))
      .returning();
    return result.length > 0;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }
}
