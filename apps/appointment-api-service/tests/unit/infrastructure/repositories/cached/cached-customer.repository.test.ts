import { CachedCustomerRepository } from '@/infrastructure/repositories/cached/cached-customer.repository';
import { ICustomerRepository } from '@/application/ports/repositories/customer.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Customer } from '@/domain/entities/customer.entity';

// Mock the ReadThroughCacheWrapper since we are testing the repository, not the wrapper itself
jest.mock('@/application/use-cases/cache/read-through-cache.wrapper');
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

describe('CachedCustomerRepository', () => {
  let baseRepo: jest.Mocked<ICustomerRepository>;
  let cacheProvider: jest.Mocked<ICacheProvider>;
  let cachedRepo: CachedCustomerRepository;
  let mockCacheWrapperInstance: jest.Mocked<ReadThroughCacheWrapper<Customer>>;

  beforeEach(() => {
    baseRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveAppointments: jest.fn(),
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
    } as unknown as jest.Mocked<ReadThroughCacheWrapper<Customer>>;

    (ReadThroughCacheWrapper as jest.Mock).mockImplementation(() => mockCacheWrapperInstance);

    cachedRepo = new CachedCustomerRepository(baseRepo, cacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should delegate to cache wrapper', async () => {
      const mockCustomer: Customer = {
        id: '123',
        tenantId: 'tenant',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockCacheWrapperInstance.get.mockResolvedValue(mockCustomer);

      const result = await cachedRepo.findById('tenant', '123');

      expect(mockCacheWrapperInstance.get).toHaveBeenCalledWith('tenant', '123', expect.any(Function), expect.any(Function));
      expect(result).toEqual(mockCustomer);

      // Verify the fallback function calls the base repo
      const fallbackFn = mockCacheWrapperInstance.get.mock.calls[0][2];
      baseRepo.findById.mockResolvedValue(mockCustomer);
      const fallbackResult = await fallbackFn();
      expect(baseRepo.findById).toHaveBeenCalledWith('tenant', '123');
      expect(fallbackResult).toEqual(mockCustomer);
    });
  });

  describe('findByEmail', () => {
    it('should pass through to base repository', async () => {
      const mockCustomer: Customer = {
        id: '123',
        tenantId: 'tenant',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      baseRepo.findByEmail.mockResolvedValue(mockCustomer);
      const result = await cachedRepo.findByEmail('tenant', 'john@example.com');

      expect(baseRepo.findByEmail).toHaveBeenCalledWith('tenant', 'john@example.com');
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('create', () => {
    it('should pass through to base repository and return the new customer', async () => {
      const mockCustomer: Customer = {
        id: '123',
        tenantId: 'tenant',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      baseRepo.create.mockResolvedValue(mockCustomer);
      const result = await cachedRepo.create(mockCustomer);

      expect(baseRepo.create).toHaveBeenCalledWith(mockCustomer);
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('update', () => {
    it('should pass through to base repository and invalidate the cache', async () => {
      const mockCustomer: Customer = {
        id: '123',
        tenantId: 'tenant',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      baseRepo.update.mockResolvedValue(mockCustomer);
      const result = await cachedRepo.update('tenant', '123', { firstName: 'Jane' });

      expect(baseRepo.update).toHaveBeenCalledWith('tenant', '123', { firstName: 'Jane' });
      expect(mockCacheWrapperInstance.invalidate).toHaveBeenCalledWith('tenant', '123');
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('softDelete', () => {
    it('should pass through to base repository and invalidate the cache', async () => {
      baseRepo.softDelete.mockResolvedValue();
      await cachedRepo.softDelete('tenant', '123');

      expect(baseRepo.softDelete).toHaveBeenCalledWith('tenant', '123');
      expect(mockCacheWrapperInstance.invalidate).toHaveBeenCalledWith('tenant', '123');
    });
  });
});
