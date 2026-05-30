import { IUserTenantRepository } from '../../../ports/repositories/user-tenant.repository.port';
import { IRefreshTokenRepository } from '../../../ports/repositories/refresh-token.repository.port';
import { JwtService } from '../../../../infrastructure/auth/jwt.service';
import { UnauthorizedException } from '../../../../domain/exceptions';

export class SwitchTenantUseCase {
  constructor(
    private userTenantRepository: IUserTenantRepository,
    private refreshTokenRepository: IRefreshTokenRepository,
    private jwtService: JwtService
  ) {}

  async execute(userId: string, targetTenantId: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string; tenantId: string }> {
    // 1. Verify they belong to target tenant
    const userTenant = await this.userTenantRepository.findByUserAndTenant(userId, targetTenantId);
    if (!userTenant) {
      throw new UnauthorizedException('User is not a member of the target tenant');
    }

    // 2. Revoke old refresh token (optional but good for security)
    if (refreshToken) {
      await this.refreshTokenRepository.revoke(refreshToken);
    }

    // 3. Issue new tokens
    const accessToken = this.jwtService.generateAccessToken({
      userId,
      tenantId: targetTenantId,
      role: userTenant.role,
      permissions: [],
      isSuperAdmin: false, // In a real app we'd fetch this from the user entity
    });

    const newRefreshToken = this.jwtService.generateRefreshToken({
      userId,
      tenantId: targetTenantId,
    });

    await this.refreshTokenRepository.create({
      userId,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken: newRefreshToken, tenantId: targetTenantId };
  }
}
