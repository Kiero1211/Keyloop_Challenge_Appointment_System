import { ListAppointmentsUseCase } from '../../../src/application/use-cases/crud/appointment/list-appointments.use-case';
import { IAppointmentCrudRepository } from '../../../src/application/ports/repositories/appointment-crud.repository.port';

describe('ListAppointmentsUseCase', () => {
  let useCase: ListAppointmentsUseCase;
  let mockRepo: jest.Mocked<IAppointmentCrudRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
      findOverlapping: jest.fn(),
    };
    useCase = new ListAppointmentsUseCase(mockRepo);
  });

  it('should apply filters and pagination', async () => {
    mockRepo.findAll.mockResolvedValue([]);
    const filters = { date: '2026-06-01', status: 'PENDING', technicianId: 't1', serviceBayId: 'b1' };
    
    await useCase.execute(filters, 2, 50);
    
    expect(mockRepo.findAll).toHaveBeenCalledWith(filters, 2, 50);
  });
});
