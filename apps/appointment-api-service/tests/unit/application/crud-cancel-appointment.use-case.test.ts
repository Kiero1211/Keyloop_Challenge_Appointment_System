import { CancelAppointmentUseCase } from '@/application/use-cases/crud/appointment/cancel-appointment.use-case';
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { NotFoundException, UnprocessableException } from '@/domain/exceptions';

describe('CancelAppointmentUseCase', () => {
  let mockApptRepo: IAppointmentCrudRepository;
  let mockCache: jest.Mocked<ICacheProvider>;
  let useCase: CancelAppointmentUseCase;

  beforeEach(() => {
    mockApptRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as IAppointmentCrudRepository;
    mockCache = {
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

    useCase = new CancelAppointmentUseCase(mockApptRepo, mockCache);
  });

  it('should cancel an appointment', async () => {
    (mockApptRepo.findById as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Scheduled' });
    (mockApptRepo.updateStatus as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Cancelled' });

    const result = await useCase.execute('t1', 'a1');
    expect(result.status).toBe('Cancelled');
    expect(mockApptRepo.updateStatus).toHaveBeenCalledWith('t1', 'a1', 'Cancelled');
    expect(mockCache.srem).toHaveBeenCalled();
    expect(mockCache.zrem).toHaveBeenCalled();
  });

  it('should throw NotFoundException if appointment does not exist', async () => {
    (mockApptRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('t1', 'a1')).rejects.toThrow(NotFoundException);
  });

  it('should throw UnprocessableException if appointment is already completed', async () => {
    (mockApptRepo.findById as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Completed' });

    await expect(useCase.execute('t1', 'a1')).rejects.toThrow(UnprocessableException);
  });
});
