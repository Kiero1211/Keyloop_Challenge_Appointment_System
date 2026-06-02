import { ICacheProvider } from '@/application/ports/cache-provider.port';
import Redis from 'ioredis';

export class RedisCacheAdapter implements ICacheProvider {
  constructor(private readonly redisClient: Redis) {}

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result > 0;
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async hset(key: string, fields: Record<string, string>, ttlSeconds?: number): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      const pipeline = this.redisClient.pipeline();
      pipeline.hset(key, fields);
      pipeline.expire(key, ttlSeconds);
      await pipeline.exec();
    } else {
      await this.redisClient.hset(key, fields);
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.redisClient.expire(key, seconds);
    return result === 1;
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

  async deleteMultiple(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.redisClient.del(...keys);
  }

  async setMultipleIfNotExists(items: { key: string; value: string }[], ttlSeconds: number): Promise<boolean> {
    if (items.length === 0) return true;
    
    const keys = items.map(item => item.key);
    const values = items.map(item => item.value);
    
    const luaScript = `
      local ttl = tonumber(ARGV[1])
      local args_offset = 1

      for i, key in ipairs(KEYS) do
        if redis.call("EXISTS", key) == 1 then
          return 0
        end
      end

      for i, key in ipairs(KEYS) do
        redis.call("SET", key, ARGV[i + args_offset], "EX", ttl)
      end

      return 1
    `;

    const result = await this.redisClient.eval(luaScript, keys.length, ...keys, ttlSeconds, ...values);
    return result === 1;
  }


  async ping(): Promise<boolean> {
    try {
      const response = await this.redisClient.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  async sadd(key: string, members: string[], ttlSeconds?: number): Promise<number> {
    if (members.length === 0) return 0;
    
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      const pipeline = this.redisClient.pipeline();
      pipeline.sadd(key, ...members);
      pipeline.expire(key, ttlSeconds);
      const results = await pipeline.exec();
      // results[0][1] contains the result of the sadd operation
      return (results?.[0]?.[1] as number) || 0;
    } else {
      return this.redisClient.sadd(key, ...members);
    }
  }

  async smembers(key: string): Promise<string[]> {
    return this.redisClient.smembers(key);
  }
}
