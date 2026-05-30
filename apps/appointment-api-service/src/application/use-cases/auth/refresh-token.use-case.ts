import { IRefreshTokenRepository } from '../../../ports/repositories/refresh-token.repository.port';
import { JwtService } from '../../../../infrastructure/auth/jwt.service';
import { UnauthorizedException } from '../../../../domain/exceptions';

export class RefreshTokenUseCase {
  constructor(
    private refreshTokenRepository: IRefreshTokenRepository,
    private jwtService: JwtService
  ) {}

  async execute(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded;
    try {
      decoded = this.jwtService.verifyRefreshToken(token);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const storedToken = await this.refreshTokenRepository.findByToken(token);
    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token is invalid or revoked');
    }

    // Revoke old token
    await this.refreshTokenRepository.revoke(token);

    // Generate new tokens
    const accessToken = this.jwtService.generateAccessToken({
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: 'TenantUser', // Need to fetch real role ideally
      permissions: [],
      isSuperAdmin: false,
    });

    const newRefreshToken = this.jwtService.generateRefreshToken({
      userId: decoded.userId,
      tenantId: decoded.tenantId,
    });

    await this.refreshTokenRepository.create({
      userId: decoded.userId,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken: newRefreshToken };
  }
}
