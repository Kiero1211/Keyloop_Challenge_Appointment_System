import { CachedServiceTypeRepository } from '@/infrastructure/repositories/cached/cached-service-type.repository';
import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { ServiceType } from '@/domain/entities/service-type.entity';

// Mock the ReadThroughCacheWrapper since we are testing the repository, not the wrapper itself
jest.mock('@/application/use-cases/cache/read-through-cache.wrapper');
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

describe('CachedServiceTypeRepository', () => {
  let baseRepo: jest.Mocked<IServiceTypeRepository>;
  let cacheProvider: jest.Mocked<ICacheProvider>;
  let cachedRepo: CachedServiceTypeRepository;
  let mockCacheWrapperInstance: jest.Mocked<ReadThroughCacheWrapper<ServiceType>>;

  beforeEach(() => {
    baseRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
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
    } as unknown as jest.Mocked<ReadThroughCacheWrapper<ServiceType>>;

    (ReadThroughCacheWrapper as jest.Mock).mockImplementation(() => mockCacheWrapperInstance);

    cachedRepo = new CachedServiceTypeRepository(baseRepo, cacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should delegate to cache wrapper', async () => {
      const mockType: ServiceType = {
        id: '123',
        tenantId: 'tenant',
        name: 'Oil Change',
        estimatedDurationMinutes: 60,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockCacheWrapperInstance.get.mockResolvedValue(mockType);

      const result = await cachedRepo.findById('tenant', '123');

      expect(mockCacheWrapperInstance.get).toHaveBeenCalledWith('tenant', '123', expect.any(Function), expect.any(Function));
      expect(result).toEqual(mockType);
    });
  });

  describe('findAll', () => {
    it('should delegate to baseRepository', async () => {
      baseRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });
      await cachedRepo.findAll('tenant');
      expect(baseRepo.findAll).toHaveBeenCalledWith('tenant', 1, 20);
    });
  });
});
