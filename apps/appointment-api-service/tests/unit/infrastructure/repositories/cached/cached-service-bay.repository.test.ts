import { CachedServiceBayRepository } from '@/infrastructure/repositories/cached/cached-service-bay.repository';
import { IServiceBayRepository } from '@/application/ports/repositories/service-bay.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { ServiceBay } from '@/domain/entities/service-bay.entity';

// Mock the ReadThroughCacheWrapper since we are testing the repository, not the wrapper itself
jest.mock('@/application/use-cases/cache/read-through-cache.wrapper');
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

describe('CachedServiceBayRepository', () => {
  let baseRepo: jest.Mocked<IServiceBayRepository>;
  let cacheProvider: jest.Mocked<ICacheProvider>;
  let cachedRepo: CachedServiceBayRepository;
  let mockCacheWrapperInstance: jest.Mocked<ReadThroughCacheWrapper<ServiceBay>>;

  beforeEach(() => {
    baseRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
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
    };

    mockCacheWrapperInstance = {
      get: jest.fn(),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<ReadThroughCacheWrapper<ServiceBay>>;

    (ReadThroughCacheWrapper as jest.Mock).mockImplementation(() => mockCacheWrapperInstance);

    cachedRepo = new CachedServiceBayRepository(baseRepo, cacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should delegate to cache wrapper', async () => {
      const mockBay: ServiceBay = {
        id: '123',
        tenantId: 'tenant',
        name: 'Bay 1',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockCacheWrapperInstance.get.mockResolvedValue(mockBay);

      const result = await cachedRepo.findById('tenant', '123');

      expect(mockCacheWrapperInstance.get).toHaveBeenCalledWith('tenant', '123', expect.any(Function), expect.any(Function));
      expect(result).toEqual(mockBay);
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
