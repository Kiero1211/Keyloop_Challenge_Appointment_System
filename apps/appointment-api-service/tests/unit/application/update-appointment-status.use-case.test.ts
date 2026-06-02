import { UpdateAppointmentStatusUseCase } from '@/application/use-cases/crud/appointment/update-appointment-status.use-case';
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { UnprocessableException, NotFoundException } from '@/domain/exceptions';

describe('UpdateAppointmentStatusUseCase', () => {
  let useCase: UpdateAppointmentStatusUseCase;
  let mockRepo: jest.Mocked<IAppointmentCrudRepository>;
  let mockCache: jest.Mocked<ICacheProvider>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn()
    } as any;
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
    useCase = new UpdateAppointmentStatusUseCase(mockRepo, mockCache);
  });

  it('should successfully transition Scheduled to InProgress', async () => {
    const mockAppt: any = { id: 'a1', status: 'Scheduled' };
    mockRepo.findById.mockResolvedValue(mockAppt);
    mockRepo.updateStatus.mockResolvedValue({ ...mockAppt, status: 'InProgress' });

    const result = await useCase.execute('tenant1', 'a1', 'InProgress');
    expect(result.status).toBe('InProgress');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('tenant1', 'a1', 'InProgress');
  });

  it('should throw DomainValidationException for invalid status string', async () => {
    const mockAppt: any = { id: 'a1', status: 'Scheduled' };
    mockRepo.findById.mockResolvedValue(mockAppt);

    await expect(useCase.execute('tenant1', 'a1', 'INVALID_STATUS')).rejects.toThrow();
  });

  it('should throw UnprocessableException for invalid transition Completed to Cancelled', async () => {
    const mockAppt: any = { id: 'a1', status: 'Completed' };
    mockRepo.findById.mockResolvedValue(mockAppt);

    await expect(useCase.execute('tenant1', 'a1', 'Cancelled')).rejects.toThrow(UnprocessableException);
  });

  it('should throw NotFoundException if appointment does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant1', 'nonexistent', 'CONFIRMED')).rejects.toThrow(NotFoundException);
  });
});
