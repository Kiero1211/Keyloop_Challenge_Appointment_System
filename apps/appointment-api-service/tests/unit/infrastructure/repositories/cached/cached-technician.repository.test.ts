import { CachedTechnicianRepository } from '@/infrastructure/repositories/cached/cached-technician.repository';
import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Technician } from '@/domain/entities/technician.entity';

// Mock the ReadThroughCacheWrapper since we are testing the repository, not the wrapper itself
jest.mock('@/application/use-cases/cache/read-through-cache.wrapper');
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

describe('CachedTechnicianRepository', () => {
  let baseRepo: jest.Mocked<ITechnicianRepository>;
  let cacheProvider: jest.Mocked<ICacheProvider>;
  let cachedRepo: CachedTechnicianRepository;
  let mockCacheWrapperInstance: jest.Mocked<ReadThroughCacheWrapper<Technician>>;

  beforeEach(() => {
    baseRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findAvailable: jest.fn(),
    };
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
      sadd: jest.fn(),
      smembers: jest.fn(),
    };

    mockCacheWrapperInstance = {
      get: jest.fn(),
      invalidate: jest.fn(),
      getList: jest.fn().mockImplementation((tenantId, fetchFn) => fetchFn()),
    } as unknown as jest.Mocked<ReadThroughCacheWrapper<Technician>>;

    (ReadThroughCacheWrapper as jest.Mock).mockImplementation(() => mockCacheWrapperInstance);

    cachedRepo = new CachedTechnicianRepository(baseRepo, cacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should delegate to cache wrapper', async () => {
      const mockTech: Technician = {
        id: '123',
        tenantId: 'tenant',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockCacheWrapperInstance.get.mockResolvedValue(mockTech);

      const result = await cachedRepo.findById('tenant', '123');

      expect(mockCacheWrapperInstance.get).toHaveBeenCalledWith('tenant', '123', expect.any(Function), expect.any(Function));
      expect(result).toEqual(mockTech);
    });
  });

  describe('findAll', () => {
    it('should pass through to base repository', async () => {
      baseRepo.findAll.mockResolvedValue([]);
      await cachedRepo.findAll('tenant');
      expect(baseRepo.findAll).toHaveBeenCalledWith('tenant');
    });
  });
});
