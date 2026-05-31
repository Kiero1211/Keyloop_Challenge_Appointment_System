import { CancelAppointmentUseCase } from '@/application/use-cases/crud/appointment/cancel-appointment.use-case';
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { NotFoundException, UnprocessableException } from '@/domain/exceptions';

describe('CancelAppointmentUseCase', () => {
  let mockApptRepo: IAppointmentCrudRepository;
  let useCase: CancelAppointmentUseCase;

  beforeEach(() => {
    mockApptRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as IAppointmentCrudRepository;

    useCase = new CancelAppointmentUseCase(mockApptRepo);
  });

  it('should cancel an appointment', async () => {
    (mockApptRepo.findById as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Scheduled' });
    (mockApptRepo.updateStatus as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Cancelled' });

    const result = await useCase.execute('t1', 'a1');
    expect(result.status).toBe('Cancelled');
    expect(mockApptRepo.updateStatus).toHaveBeenCalledWith('t1', 'a1', 'Cancelled');
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
