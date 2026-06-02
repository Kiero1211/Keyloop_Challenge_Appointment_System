import { CachedVehicleRepository } from '@/infrastructure/repositories/cached/cached-vehicle.repository';
import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Vehicle } from '@/domain/entities/vehicle.entity';

// Mock the ReadThroughCacheWrapper since we are testing the repository, not the wrapper itself
jest.mock('@/application/use-cases/cache/read-through-cache.wrapper');
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

describe('CachedVehicleRepository', () => {
  let baseRepo: jest.Mocked<IVehicleRepository>;
  let cacheProvider: jest.Mocked<ICacheProvider>;
  let cachedRepo: CachedVehicleRepository;
  let mockCacheWrapperInstance: jest.Mocked<ReadThroughCacheWrapper<Vehicle>>;

  beforeEach(() => {
    baseRepo = {
      findById: jest.fn(),
      findByCustomer: jest.fn(),
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
    };

    mockCacheWrapperInstance = {
      get: jest.fn(),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<ReadThroughCacheWrapper<Vehicle>>;

    (ReadThroughCacheWrapper as jest.Mock).mockImplementation(() => mockCacheWrapperInstance);

    cachedRepo = new CachedVehicleRepository(baseRepo, cacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should delegate to cache wrapper', async () => {
      const mockVehicle: Vehicle = {
        id: '123',
        tenantId: 'tenant',
        customerId: 'customer123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'ABC-1234',
        vin: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      
      mockCacheWrapperInstance.get.mockResolvedValue(mockVehicle);

      const result = await cachedRepo.findById('tenant', '123');

      expect(mockCacheWrapperInstance.get).toHaveBeenCalledWith('tenant', '123', expect.any(Function), expect.any(Function));
      expect(result).toEqual(mockVehicle);

      // Verify the fallback function calls the base repo
      const fallbackFn = mockCacheWrapperInstance.get.mock.calls[0][2];
      baseRepo.findById.mockResolvedValue(mockVehicle);
      const fallbackResult = await fallbackFn();
      expect(baseRepo.findById).toHaveBeenCalledWith('tenant', '123');
      expect(fallbackResult).toEqual(mockVehicle);
    });
  });

  describe('findByCustomer', () => {
    it('should pass through to base repository', async () => {
      const mockVehicle: Vehicle = {
        id: '123',
        tenantId: 'tenant',
        customerId: 'customer123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'ABC-1234',
        vin: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      
      baseRepo.findByCustomer.mockResolvedValue([mockVehicle]);
      const result = await cachedRepo.findByCustomer('tenant', 'customer123');

      expect(baseRepo.findByCustomer).toHaveBeenCalledWith('tenant', 'customer123');
      expect(result).toEqual([mockVehicle]);
    });
  });

  describe('create', () => {
    it('should pass through to base repository and return the new vehicle', async () => {
      const mockVehicle: Vehicle = {
        id: '123',
        tenantId: 'tenant',
        customerId: 'customer123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'ABC-1234',
        vin: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      
      baseRepo.create.mockResolvedValue(mockVehicle);
      const result = await cachedRepo.create(mockVehicle);

      expect(baseRepo.create).toHaveBeenCalledWith(mockVehicle);
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('update', () => {
    it('should pass through to base repository and invalidate the cache', async () => {
      const mockVehicle: Vehicle = {
        id: '123',
        tenantId: 'tenant',
        customerId: 'customer123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'ABC-1234',
        vin: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      
      baseRepo.update.mockResolvedValue(mockVehicle);
      const result = await cachedRepo.update('tenant', '123', { make: 'Honda' });

      expect(baseRepo.update).toHaveBeenCalledWith('tenant', '123', { make: 'Honda' });
      expect(mockCacheWrapperInstance.invalidate).toHaveBeenCalledWith('tenant', '123');
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('softDelete', () => {
    it('should pass through to base repository and invalidate the cache', async () => {
      baseRepo.softDelete.mockResolvedValue(true);
      const result = await cachedRepo.softDelete('tenant', '123');

      expect(baseRepo.softDelete).toHaveBeenCalledWith('tenant', '123');
      expect(mockCacheWrapperInstance.invalidate).toHaveBeenCalledWith('tenant', '123');
      expect(result).toBe(true);
    });
  });

  describe('hasActiveAppointments', () => {
    it('should pass through to base repository', async () => {
      baseRepo.hasActiveAppointments.mockResolvedValue(true);
      const result = await cachedRepo.hasActiveAppointments('tenant', '123');

      expect(baseRepo.hasActiveAppointments).toHaveBeenCalledWith('tenant', '123');
      expect(result).toBe(true);
    });
  });
});
