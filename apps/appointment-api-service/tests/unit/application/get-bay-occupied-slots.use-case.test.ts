import { GetBayOccupiedSlotsUseCase } from '@/application/use-cases/get-bay-occupied-slots.use-case';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { bayOccupiedKey, occupiedSlotHashKey } from '@/domain/cache-keys';

describe('GetBayOccupiedSlotsUseCase', () => {
  let cacheProvider: jest.Mocked<ICacheProvider>;

  beforeEach(() => {
    cacheProvider = {
      exists: jest.fn(),
      get: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      del: jest.fn(),
      deleteMultiple: jest.fn(),
      ping: jest.fn(),
      setMultipleIfNotExists: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn(),
      expire: jest.fn(),
      zadd: jest.fn(),
      zrem: jest.fn(),
      zrangebyscore: jest.fn(),
      srem: jest.fn(),
    } as any;
  });

  it('loads occupied slots for the selected day range', async () => {
    cacheProvider.zrangebyscore.mockResolvedValue(['appt-9']);
    cacheProvider.hgetall.mockResolvedValueOnce({
      appointment_id: 'appt-9',
      start_time: '2026-06-03T10:00:00.000Z',
      end_time: '2026-06-03T11:00:00.000Z',
    });

    const sut = new GetBayOccupiedSlotsUseCase(cacheProvider);
    const result = await sut.execute('tenant-1', 'bay-1', '2026-06-03');

    expect(cacheProvider.zrangebyscore).toHaveBeenCalledWith(
      bayOccupiedKey('tenant-1', 'bay-1'),
      expect.any(Number),
      expect.any(Number)
    );
    expect(cacheProvider.hgetall).toHaveBeenCalledWith(occupiedSlotHashKey('tenant-1', 'appt-9'));
    expect(result).toEqual({
      serviceBayId: 'bay-1',
      occupiedSlots: [
        {
          appointmentId: 'appt-9',
          startTime: '2026-06-03T10:00:00.000Z',
          endTime: '2026-06-03T11:00:00.000Z',
        },
      ],
    });
  });
});
