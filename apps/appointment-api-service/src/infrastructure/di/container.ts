import Redis from 'ioredis';
import { RedisCacheAdapter } from '../cache/redis-cache.adapter';
import { RedisStreamPublisher } from '../messaging/redis-stream.publisher';
import { CreateAppointmentUseCase } from '../../application/use-cases/create-appointment.use-case';
import { HealthCheckUseCase } from '../../application/use-cases/health-check.use-case';
import { PartitionHasher } from '../../domain/utils/partition-hasher';

class DIContainer {
  public redisClient!: Redis;
  public cacheProvider!: RedisCacheAdapter;
  public messagePublisher!: RedisStreamPublisher;
  public createAppointmentUseCase!: CreateAppointmentUseCase;
  public healthCheckUseCase!: HealthCheckUseCase;

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
  }

  async destroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export const container = new DIContainer();
