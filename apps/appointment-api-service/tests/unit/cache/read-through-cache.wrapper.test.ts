import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';
import { ICacheProvider } from '@/application/ports/cache-provider.port';

describe('ReadThroughCacheWrapper', () => {
  let cacheProvider: jest.Mocked<ICacheProvider>;
  let wrapper: ReadThroughCacheWrapper<any>;
  const tenantId = 'tenant-123';
  const entityId = 'entity-456';
  const entityName = 'TestEntity';
  const cacheKey = `tenant:${tenantId}:test-entity:${entityId}`;

  beforeEach(() => {
    cacheProvider = {
      exists: jest.fn(),
      get: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
      deleteMultiple: jest.fn(),
      ping: jest.fn(),
      setMultipleIfNotExists: jest.fn(),
      zadd: jest.fn(),
      zrem: jest.fn(),
      zrangebyscore: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
    };
    wrapper = new ReadThroughCacheWrapper(cacheProvider, entityName);
  });

  describe('get (fetch)', () => {
    it('should return from cache if exists', async () => {
      const cachedData = {
        id: entityId,
        tenantId,
        name: 'Test',
        createdAt: new Date('2023-01-01T00:00:00.000Z').toISOString(),
      };
      cacheProvider.hgetall.mockResolvedValue(cachedData);
      const fetchFromDb = jest.fn();

      const result = await wrapper.get(tenantId, entityId, fetchFromDb);

      expect(cacheProvider.hgetall).toHaveBeenCalledWith(cacheKey);
      expect(fetchFromDb).not.toHaveBeenCalled();
      
      expect(result.createdAt).toBe(cachedData.createdAt); // Raw without deserializer
      expect(result.name).toBe('Test');
    });

    it('should fetch from fallback and cache it if not in cache', async () => {
      cacheProvider.hgetall.mockResolvedValue(null);
      const dbEntity = {
        id: entityId,
        tenantId,
        name: 'Test DB',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        nestedObj: { foo: 'bar' }
      };
      const fetchFromDb = jest.fn().mockResolvedValue(dbEntity);

      const result = await wrapper.get(tenantId, entityId, fetchFromDb);

      expect(cacheProvider.hgetall).toHaveBeenCalledWith(cacheKey);
      expect(fetchFromDb).toHaveBeenCalled();
      
      expect(cacheProvider.hset).toHaveBeenCalledWith(
        cacheKey,
        expect.objectContaining({
          id: entityId,
          tenantId,
          name: 'Test DB',
          createdAt: dbEntity.createdAt.toISOString(),
          nestedObj: JSON.stringify(dbEntity.nestedObj)
        }),
        3600 // Default TTL
      );

      expect(result).toEqual(dbEntity);
    });

    it('should apply custom TTL if ttlResolver is provided', async () => {
      cacheProvider.hgetall.mockResolvedValue(null);
      const dbEntity = { id: entityId, tenantId, status: 'Completed' };
      const fetchFromDb = jest.fn().mockResolvedValue(dbEntity);
      const ttlResolver = (entity: any) => entity.status === 'Completed' ? 21600 : 3600;

      await wrapper.get(tenantId, entityId, fetchFromDb, undefined, ttlResolver);

      expect(cacheProvider.hset).toHaveBeenCalledWith(
        cacheKey,
        expect.any(Object),
        21600
      );
    });
  });

  describe('invalidate', () => {
    it('should delete hash from cache', async () => {
      await wrapper.invalidate(tenantId, entityId);
      expect(cacheProvider.del).toHaveBeenCalledWith(cacheKey);
    });
  });
});
