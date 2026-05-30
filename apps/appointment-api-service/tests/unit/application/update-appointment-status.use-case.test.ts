import { UpdateAppointmentStatusUseCase } from '../../../src/application/use-cases/crud/appointment/update-appointment-status.use-case';
import { IAppointmentCrudRepository } from '../../../src/application/ports/repositories/appointment-crud.repository.port';
import { UnprocessableException, NotFoundException } from '../../../src/domain/exceptions';

describe('UpdateAppointmentStatusUseCase', () => {
  let useCase: UpdateAppointmentStatusUseCase;
  let mockRepo: jest.Mocked<IAppointmentCrudRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn()
    } as any;
    useCase = new UpdateAppointmentStatusUseCase(mockRepo);
  });

  it('should successfully transition PENDING to CONFIRMED', async () => {
    const mockAppt: any = { id: 'a1', status: 'PENDING' };
    mockRepo.findById.mockResolvedValue(mockAppt);
    mockRepo.updateStatus.mockResolvedValue({ ...mockAppt, status: 'CONFIRMED' });

    const result = await useCase.execute('tenant1', 'a1', 'CONFIRMED');
    expect(result.status).toBe('CONFIRMED');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('tenant1', 'a1', 'CONFIRMED');
  });

  it('should throw UnprocessableException for invalid transition COMPLETED to CANCELLED', async () => {
    const mockAppt: any = { id: 'a1', status: 'COMPLETED' };
    mockRepo.findById.mockResolvedValue(mockAppt);

    await expect(useCase.execute('tenant1', 'a1', 'CANCELLED')).rejects.toThrow(UnprocessableException);
  });

  it('should throw NotFoundException if appointment does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant1', 'nonexistent', 'CONFIRMED')).rejects.toThrow(NotFoundException);
  });
});
