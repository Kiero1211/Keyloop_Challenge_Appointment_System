import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';
import { IRefreshTokenRepository } from '@/application/ports/repositories/refresh-token.repository.port';
import { JwtService } from '@/infrastructure/auth/jwt.service';
import { UnauthorizedException } from '@/domain/exceptions';
import * as bcrypt from 'bcryptjs';

export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private userTenantRepository: IUserTenantRepository,
    private refreshTokenRepository: IRefreshTokenRepository,
    private jwtService: JwtService
  ) {}

  async execute(data: any): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Default to the user's first tenant for now (or a specified one)
    const userTenants = await this.userTenantRepository.findByUserId(user.id);
    const primaryTenant = userTenants.length > 0 ? userTenants[0] : null;
    
    // In a real system, you might default to lastActiveTenantId
    const tenantId = primaryTenant?.tenantId || 'system';
    const role = primaryTenant?.role || user.role;

    const accessToken = this.jwtService.generateAccessToken({
      userId: user.id,
      tenantId: tenantId,
      role: role,
      permissions: user.permissions || [],
      isSuperAdmin: user.isSuperAdmin,
    });

    const refreshTokenString = this.jwtService.generateRefreshToken({
      userId: user.id,
      tenantId: tenantId,
    });

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenString,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await this.userRepository.updateLastLogin(user.id, new Date());

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId,
        role,
        isSuperAdmin: user.isSuperAdmin
      }
    };
  }
}
