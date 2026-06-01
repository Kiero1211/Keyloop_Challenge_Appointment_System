import { ICacheProvider } from '@/application/ports/cache-provider.port';

export class ReadThroughCacheWrapper<T> {
  constructor(
    private cacheProvider: ICacheProvider,
    private entityName: string,
    private ttlSeconds: number = 3600 // Default 1 hour TTL
  ) {}

  private getCacheKey(tenantId: string, id: string): string {
    return `${tenantId}:${this.entityName}:${id}`;
  }

  private serialize(entity: T): Record<string, string> {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(entity as any)) {
      if (value instanceof Date) {
        record[key] = value.toISOString();
      } else if (typeof value === 'object' && value !== null) {
        record[key] = JSON.stringify(value);
      } else if (value !== null && value !== undefined) {
        record[key] = value.toString();
      }
    }
    return record;
  }

  private deserialize(record: Record<string, string>): T {
    // This is a naive deserialization. Ideally, we would have a schema to parse it correctly,
    // but we can try to guess dates, booleans, and numbers, or just return as strings and let the caller handle it.
    // However, since we know it's a general entity, returning fields as they were might require specific mapping.
    // To make it simple but robust, let's assume the caller can provide a custom deserializer if needed,
    // or we just return the raw record and let the caller cast/parse.
    return record as unknown as T; // This might be dangerous if dates are expected as Date objects!
  }

  async get(
    tenantId: string,
    id: string,
    fetchFromDb: () => Promise<T | null>,
    deserializer?: (record: Record<string, string>) => T,
    ttlResolver?: (entity: T) => number
  ): Promise<T | null> {
    const key = this.getCacheKey(tenantId, id);
    
    // Try to get from cache
    const cached = await this.cacheProvider.hgetall(key);
    if (cached && Object.keys(cached).length > 0) {
      return deserializer ? deserializer(cached) : this.deserialize(cached);
    }

    // Cache miss, fetch from DB
    const entity = await fetchFromDb();
    if (entity) {
      // Save to cache
      const ttl = ttlResolver ? ttlResolver(entity) : this.ttlSeconds;
      await this.cacheProvider.hset(key, this.serialize(entity), ttl);
    }
    return entity;
  }

  async invalidate(tenantId: string, id: string): Promise<void> {
    const key = this.getCacheKey(tenantId, id);
    await this.cacheProvider.del(key);
  }
}
