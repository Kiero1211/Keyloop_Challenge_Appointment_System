import { ICacheProvider } from '../../application/ports/cache-provider.port';
import Redis from 'ioredis';

export class RedisCacheAdapter implements ICacheProvider {
  constructor(private readonly redisClient: Redis) {}

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result > 0;
  }

  async hset(key: string, fields: Record<string, string>): Promise<void> {
    await this.redisClient.hset(key, fields);
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const result = await this.redisClient.hgetall(key);
    if (Object.keys(result).length === 0) {
      return null;
    }
    return result;
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.redisClient.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }
}
