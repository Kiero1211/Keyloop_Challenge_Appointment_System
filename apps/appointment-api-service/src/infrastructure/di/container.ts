import Redis from 'ioredis';
import { RedisCacheAdapter } from '@/infrastructure/cache/redis-cache.adapter';
import { RedisStreamPublisher } from '@/infrastructure/messaging/redis-stream.publisher';
import { CreateAppointmentUseCase } from '@/application/use-cases/create-appointment.use-case';
import { HealthCheckUseCase } from '@/application/use-cases/health-check.use-case';
import { PartitionHasher } from '@/domain/utils/partition-hasher';
import { JwtService } from '@/infrastructure/auth/jwt.service';
import { DrizzleUserRepository } from '@/infrastructure/db/repositories/drizzle-user.repository';
import { DrizzleRefreshTokenRepository } from '@/infrastructure/db/repositories/drizzle-refresh-token.repository';
import { DrizzleUserTenantRepository } from '@/infrastructure/db/repositories/drizzle-user-tenant.repository';
import { DrizzleServiceTypeRepository } from '@/infrastructure/db/repositories/drizzle-service-type.repository';
import { DrizzleTechnicianRepository } from '@/infrastructure/db/repositories/drizzle-technician.repository';
import { DrizzleTechnicianSkillRepository } from '@/infrastructure/db/repositories/drizzle-technician-skill.repository';
import { DrizzleServiceBayRepository } from '@/infrastructure/db/repositories/drizzle-service-bay.repository';
import { DrizzleAuditLogRepository } from '@/infrastructure/db/repositories/drizzle-audit-log.repository';
import { db } from '@/infrastructure/db/client';
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';

import { DrizzleCustomerRepository } from '@/infrastructure/db/repositories/drizzle-customer.repository';
import { DrizzleVehicleRepository } from '@/infrastructure/db/repositories/drizzle-vehicle.repository';
import { DrizzleTenantRepository } from '@/infrastructure/db/repositories/drizzle-tenant.repository';
import { DrizzleAppointmentCrudRepository } from '@/infrastructure/db/repositories/drizzle-appointment-crud.repository';
import { CachedCustomerRepository } from '@/infrastructure/repositories/cached/cached-customer.repository';
import { CachedVehicleRepository } from '@/infrastructure/repositories/cached/cached-vehicle.repository';
import { CachedServiceBayRepository } from '@/infrastructure/repositories/cached/cached-service-bay.repository';
import { CachedServiceTypeRepository } from '@/infrastructure/repositories/cached/cached-service-type.repository';
import { CachedTechnicianRepository } from '@/infrastructure/repositories/cached/cached-technician.repository';
import { CachedAppointmentCrudRepository } from '@/infrastructure/repositories/cached/cached-appointment-crud.repository';
import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { IServiceBayRepository } from '@/application/ports/repositories/service-bay.repository.port';
import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
class DIContainer {
  public redisClient!: Redis;
  public cacheProvider!: RedisCacheAdapter;
  public messagePublisher!: RedisStreamPublisher;
  public createAppointmentUseCase!: CreateAppointmentUseCase;
  public healthCheckUseCase!: HealthCheckUseCase;
  public jwtService!: JwtService;
  public userRepository!: DrizzleUserRepository;
  public refreshTokenRepository!: DrizzleRefreshTokenRepository;
  public userTenantRepository!: DrizzleUserTenantRepository;
  public appointmentCrudRepository!: IAppointmentCrudRepository;
  public serviceTypeRepository!: IServiceTypeRepository;
  public technicianRepository!: ITechnicianRepository;
  public technicianSkillRepository!: DrizzleTechnicianSkillRepository;
  public serviceBayRepository!: IServiceBayRepository;
  public customerRepository!: ICustomerRepository;
  public vehicleRepository!: IVehicleRepository;
  public tenantRepository!: DrizzleTenantRepository;
  public auditLogRepository!: DrizzleAuditLogRepository;
  async initialize(redisClientInstance?: Redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redisClient = redisClientInstance || new Redis(redisUrl);
    
    this.cacheProvider = new RedisCacheAdapter(this.redisClient);
    this.messagePublisher = new RedisStreamPublisher(this.redisClient);

    this.serviceTypeRepository = new CachedServiceTypeRepository(new DrizzleServiceTypeRepository(), this.cacheProvider);
    
    this.createAppointmentUseCase = new CreateAppointmentUseCase(
      this.cacheProvider,
      this.messagePublisher,
      this.serviceTypeRepository,
      PartitionHasher.hash.bind(PartitionHasher)
    );

    this.healthCheckUseCase = new HealthCheckUseCase(this.cacheProvider);
    
    this.jwtService = new JwtService(
      process.env.JWT_SECRET || 'super-secret-jwt-key',
      process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );
    this.userRepository = new DrizzleUserRepository();
    this.refreshTokenRepository = new DrizzleRefreshTokenRepository();
    this.userTenantRepository = new DrizzleUserTenantRepository();
    
    this.appointmentCrudRepository = new CachedAppointmentCrudRepository(new DrizzleAppointmentCrudRepository(), this.cacheProvider);
    this.technicianRepository = new CachedTechnicianRepository(new DrizzleTechnicianRepository(), this.cacheProvider);
    this.technicianSkillRepository = new DrizzleTechnicianSkillRepository();
    this.serviceBayRepository = new CachedServiceBayRepository(new DrizzleServiceBayRepository(), this.cacheProvider);
    this.customerRepository = new CachedCustomerRepository(new DrizzleCustomerRepository(), this.cacheProvider);
    this.vehicleRepository = new CachedVehicleRepository(new DrizzleVehicleRepository(), this.cacheProvider);
    this.tenantRepository = new DrizzleTenantRepository();
    this.auditLogRepository = new DrizzleAuditLogRepository(db);
  }

  async destroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export const container = new DIContainer();
