import { GetTechnicianOccupiedSlotsUseCase } from '@/application/use-cases/get-technician-occupied-slots.use-case';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { occupiedSlotHashKey, technicianOccupiedKey } from '@/domain/cache-keys';

describe('GetTechnicianOccupiedSlotsUseCase', () => {
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
    cacheProvider.zrangebyscore.mockResolvedValue(['appt-1', 'appt-2']);
    cacheProvider.hgetall
      .mockResolvedValueOnce({
        appointment_id: 'appt-1',
        start_time: '2026-06-03T02:00:00.000Z',
        end_time: '2026-06-03T03:00:00.000Z',
      })
      .mockResolvedValueOnce({
        appointment_id: 'appt-2',
        start_time: '2026-06-03T04:00:00.000Z',
        end_time: '2026-06-03T05:00:00.000Z',
      });

    const sut = new GetTechnicianOccupiedSlotsUseCase(cacheProvider);
    const result = await sut.execute('tenant-1', 'tech-1', '2026-06-03');

    expect(cacheProvider.zrangebyscore).toHaveBeenCalledWith(
      technicianOccupiedKey('tenant-1', 'tech-1'),
      expect.any(Number),
      expect.any(Number)
    );
    expect(cacheProvider.hgetall).toHaveBeenNthCalledWith(1, occupiedSlotHashKey('tenant-1', 'appt-1'));
    expect(cacheProvider.hgetall).toHaveBeenNthCalledWith(2, occupiedSlotHashKey('tenant-1', 'appt-2'));
    expect(result).toEqual({
      technicianId: 'tech-1',
      occupiedSlots: [
        {
          appointmentId: 'appt-1',
          startTime: '2026-06-03T02:00:00.000Z',
          endTime: '2026-06-03T03:00:00.000Z',
        },
        {
          appointmentId: 'appt-2',
          startTime: '2026-06-03T04:00:00.000Z',
          endTime: '2026-06-03T05:00:00.000Z',
        },
      ],
    });
  });
});
