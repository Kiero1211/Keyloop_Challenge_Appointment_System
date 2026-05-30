import { IUserRepository } from '@/application/ports/repositories/user.repository.port';
import { IUserTenantRepository } from '@/application/ports/repositories/user-tenant.repository.port';
import { ITenantRepository } from '@/application/ports/repositories/tenant.repository.port';
import { IRefreshTokenRepository } from '@/application/ports/repositories/refresh-token.repository.port';
import { JwtService } from '@/infrastructure/auth/jwt.service';
import { ConflictException, NotFoundException } from '@/domain/exceptions';
import * as bcrypt from 'bcryptjs';

export class RegisterUseCase {
  constructor(
    private userRepository: IUserRepository,
    private userTenantRepository: IUserTenantRepository,
    private tenantRepository: ITenantRepository,
    private refreshTokenRepository: IRefreshTokenRepository,
    private jwtService: JwtService
  ) {}

  async execute(data: any): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const tenant = await this.tenantRepository.findById(data.tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'TenantUser', // Default role
      isSuperAdmin: false,
    });

    await this.userTenantRepository.create({
      userId: user.id,
      tenantId: tenant.id,
      role: 'TenantUser',
    });

    const accessToken = this.jwtService.generateAccessToken({
      userId: user.id,
      tenantId: tenant.id,
      role: 'TenantUser',
      permissions: [],
      isSuperAdmin: false,
    });

    const refreshTokenString = this.jwtService.generateRefreshToken({
      userId: user.id,
      tenantId: tenant.id,
    });

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenString,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: tenant.id
      }
    };
  }
}
