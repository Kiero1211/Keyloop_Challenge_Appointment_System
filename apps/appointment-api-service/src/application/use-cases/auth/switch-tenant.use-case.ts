import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';
import { IRefreshTokenRepository } from '@/application/ports/repositories/refresh-token.repository.port';
import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { JwtService } from '@/infrastructure/auth/jwt.service';
import { UnauthorizedException } from '@/domain/exceptions';

export class SwitchTenantUseCase {
  constructor(
    private userTenantRepository: IUserTenantRepository,
    private refreshTokenRepository: IRefreshTokenRepository,
    private userRepository: IUserRepository,
    private jwtService: JwtService
  ) {}

  async execute(userId: string, targetTenantId: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string; tenantId: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let userTenant = await this.userTenantRepository.findByUserAndTenant(userId, targetTenantId);
    if (!userTenant && !user.isSuperAdmin) {
      throw new UnauthorizedException('User is not a member of the target tenant');
    }

    if (!userTenant && user.isSuperAdmin) {
      userTenant = {
        id: '',
        userId,
        tenantId: targetTenantId,
        role: 'Admin',
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const resolvedRole = userTenant?.role ?? 'Admin';

    // 2. Revoke old refresh token (optional but good for security)
    if (refreshToken) {
      await this.refreshTokenRepository.revoke(refreshToken);
    }

    // 3. Update last active tenant in user record
    await this.userRepository.update(userId, { lastActiveTenantId: targetTenantId });

    // 4. Issue new tokens
    const accessToken = this.jwtService.generateAccessToken({
      userId,
      tenantId: targetTenantId,
      role: resolvedRole,
      permissions: [],
      isSuperAdmin: user.isSuperAdmin,
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
