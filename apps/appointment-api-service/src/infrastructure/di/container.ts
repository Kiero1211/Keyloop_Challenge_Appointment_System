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
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';

import { DrizzleCustomerRepository } from '@/infrastructure/db/repositories/drizzle-customer.repository';
import { DrizzleVehicleRepository } from '@/infrastructure/db/repositories/drizzle-vehicle.repository';
import { DrizzleTenantRepository } from '@/infrastructure/db/repositories/drizzle-tenant.repository';
import { DrizzleAppointmentCrudRepository } from '@/infrastructure/db/repositories/drizzle-appointment-crud.repository';

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
  public serviceTypeRepository!: DrizzleServiceTypeRepository;
  public technicianRepository!: DrizzleTechnicianRepository;
  public technicianSkillRepository!: DrizzleTechnicianSkillRepository;
  public serviceBayRepository!: DrizzleServiceBayRepository;
  public customerRepository!: DrizzleCustomerRepository;
  public vehicleRepository!: DrizzleVehicleRepository;
  public tenantRepository!: DrizzleTenantRepository;

  async initialize(redisClientInstance?: Redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redisClient = redisClientInstance || new Redis(redisUrl);
    
    this.cacheProvider = new RedisCacheAdapter(this.redisClient);
    this.messagePublisher = new RedisStreamPublisher(this.redisClient);

    this.createAppointmentUseCase = new CreateAppointmentUseCase(
      this.cacheProvider,
      this.messagePublisher,
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
    
    this.appointmentCrudRepository = new DrizzleAppointmentCrudRepository();
    this.serviceTypeRepository = new DrizzleServiceTypeRepository();
    this.technicianRepository = new DrizzleTechnicianRepository();
    this.technicianSkillRepository = new DrizzleTechnicianSkillRepository();
    this.serviceBayRepository = new DrizzleServiceBayRepository();
    this.customerRepository = new DrizzleCustomerRepository();
    this.vehicleRepository = new DrizzleVehicleRepository();
    this.tenantRepository = new DrizzleTenantRepository();
  }

  async destroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export const container = new DIContainer();
