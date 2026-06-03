import { GetActiveAppointmentsUseCase } from '@/application/use-cases/get-active-appointments.use-case';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { activeAppointmentsSetKey, appointmentHashKey } from '@/domain/cache-keys';

describe('GetActiveAppointmentsUseCase', () => {
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
    };
  });

  it('returns only pending and scheduled appointments from the active index', async () => {
    cacheProvider.smembers.mockResolvedValue(['appt-1', 'appt-2', 'appt-3', 'appt-4']);
    cacheProvider.hgetall
      .mockResolvedValueOnce({
        id: 'appt-1',
        tenant_id: 'tenant-1',
        customer_id: 'cust-1',
        vehicle_id: 'veh-1',
        service_type_id: 'svc-1',
        technician_id: 'tech-1',
        service_bay_id: 'bay-1',
        start_time: '2026-06-03T02:00:00.000Z',
        end_time: '2026-06-03T03:00:00.000Z',
        status: 'Pending',
        notes: '',
        created_at: '2026-06-03T01:00:00.000Z',
        updated_at: '2026-06-03T01:00:00.000Z',
      })
      .mockResolvedValueOnce({
        id: 'appt-2',
        tenant_id: 'tenant-1',
        customer_id: 'cust-2',
        vehicle_id: 'veh-2',
        service_type_id: 'svc-2',
        technician_id: 'tech-2',
        service_bay_id: 'bay-2',
        start_time: '2026-06-03T04:00:00.000Z',
        end_time: '2026-06-03T05:00:00.000Z',
        status: 'Scheduled',
        notes: 'ready',
        created_at: '2026-06-03T01:00:00.000Z',
        updated_at: '2026-06-03T01:30:00.000Z',
      })
      .mockResolvedValueOnce({
        id: 'appt-3',
        tenant_id: 'tenant-1',
        status: 'Failed',
      } as any)
      .mockResolvedValueOnce(null);

    const sut = new GetActiveAppointmentsUseCase(cacheProvider);
    const result = await sut.execute('tenant-1');

    expect(cacheProvider.smembers).toHaveBeenCalledWith(activeAppointmentsSetKey('tenant-1'));
    expect(cacheProvider.hgetall).toHaveBeenNthCalledWith(1, appointmentHashKey('tenant-1', 'appt-1'));
    expect(cacheProvider.hgetall).toHaveBeenNthCalledWith(2, appointmentHashKey('tenant-1', 'appt-2'));
    expect(cacheProvider.hgetall).toHaveBeenNthCalledWith(3, appointmentHashKey('tenant-1', 'appt-3'));
    expect(cacheProvider.hgetall).toHaveBeenNthCalledWith(4, appointmentHashKey('tenant-1', 'appt-4'));
    expect(result).toEqual([
      expect.objectContaining({
        id: 'appt-1',
        status: 'Pending',
      }),
      expect.objectContaining({
        id: 'appt-2',
        status: 'Scheduled',
      }),
    ]);
  });
});
