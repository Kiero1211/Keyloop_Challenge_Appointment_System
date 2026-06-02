import { CachedAppointmentCrudRepository } from '@/infrastructure/repositories/cached/cached-appointment-crud.repository';
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { Appointment } from '@/domain/entities/appointment.entity';

// Mock the ReadThroughCacheWrapper since we are testing the repository, not the wrapper itself
jest.mock('@/application/use-cases/cache/read-through-cache.wrapper');
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';

describe('CachedAppointmentCrudRepository', () => {
  let baseRepo: jest.Mocked<IAppointmentCrudRepository>;
  let cacheProvider: jest.Mocked<ICacheProvider>;
  let cachedRepo: CachedAppointmentCrudRepository;
  let mockCacheWrapperInstance: jest.Mocked<ReadThroughCacheWrapper<Appointment>>;

  beforeEach(() => {
    baseRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findDetailById: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
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
    };

    mockCacheWrapperInstance = {
      get: jest.fn(),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<ReadThroughCacheWrapper<Appointment>>;

    (ReadThroughCacheWrapper as jest.Mock).mockImplementation(() => mockCacheWrapperInstance);

    cachedRepo = new CachedAppointmentCrudRepository(baseRepo, cacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('TTL logic via ReadThroughCacheWrapper', () => {
    it('should initialize ReadThroughCacheWrapper with correct default ttl (-1)', () => {
      expect(ReadThroughCacheWrapper).toHaveBeenCalledWith(
        cacheProvider,
        'AppointmentDetail',
        -1
      );
    });
  });

  describe('findDetailById', () => {
    it('should delegate to cache wrapper', async () => {
      const mockDetail = {
        appointment: {
          id: '123',
          tenantId: 'tenant',
          status: 'Scheduled',
        }
      };
      
      mockCacheWrapperInstance.get.mockResolvedValue(mockDetail as any);

      const result = await cachedRepo.findDetailById('tenant', '123');

      expect(mockCacheWrapperInstance.get).toHaveBeenCalledWith('tenant', '123', expect.any(Function), expect.any(Function), expect.any(Function));
      
      const ttlResolver = mockCacheWrapperInstance.get.mock.calls[0][4] as Function;
      expect(ttlResolver({ appointment: { status: 'Completed' } })).toBe(21600);
      expect(ttlResolver({ appointment: { status: 'Cancelled' } })).toBe(21600);
      expect(ttlResolver({ appointment: { status: 'Scheduled' } })).toBe(-1);
      expect(ttlResolver({ appointment: { status: 'InProgress' } })).toBe(-1);

      expect(result).toEqual(mockDetail);
    });
  });

  describe('findById', () => {
    it('should delegate to base repository directly', async () => {
      const mockAppt: Appointment = {
        id: '123',
        tenantId: 'tenant',
        customerId: 'customer123',
        vehicleId: 'vehicle123',
        serviceTypeId: 'serviceType123',
        technicianId: 'tech123',
        serviceBayId: 'bay123',
        status: 'Scheduled',
        scheduledStartTime: new Date(),
        scheduledEndTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      baseRepo.findById.mockResolvedValue(mockAppt);

      const result = await cachedRepo.findById('tenant', '123');

      expect(baseRepo.findById).toHaveBeenCalledWith('tenant', '123');
      expect(result).toEqual(mockAppt);
    });
  });

  describe('updateStatus', () => {
    it('should pass through to base repository and invalidate the cache', async () => {
      const mockAppt: Appointment = {
        id: '123',
        tenantId: 'tenant',
        customerId: 'customer123',
        vehicleId: 'vehicle123',
        serviceTypeId: 'serviceType123',
        technicianId: 'tech123',
        serviceBayId: 'bay123',
        status: 'Cancelled',
        scheduledStartTime: new Date(),
        scheduledEndTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      baseRepo.updateStatus.mockResolvedValue(mockAppt);
      const result = await cachedRepo.updateStatus('tenant', '123', 'Cancelled');

      expect(baseRepo.updateStatus).toHaveBeenCalledWith('tenant', '123', 'Cancelled');
      expect(mockCacheWrapperInstance.invalidate).toHaveBeenCalledWith('tenant', '123');
      expect(result).toEqual(mockAppt);
    });
  });
});
