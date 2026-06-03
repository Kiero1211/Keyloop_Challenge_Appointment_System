import { ListAppointmentsUseCase } from '@/application/use-cases/crud/appointment/list-appointments.use-case';
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';

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
      findDetailById: jest.fn()
    } as any;
    useCase = new ListAppointmentsUseCase(mockRepo);
  });

  it('should apply filters and pagination', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });
    const filters = { date: '2026-06-01', status: 'Scheduled', technicianId: 't1', serviceBayId: 'b1' };
    
    await useCase.execute('tenant1', 'tenant', undefined, filters, 2, 50);
    
    expect(mockRepo.findAll).toHaveBeenCalledWith('tenant1', {
      ...filters,
      scope: 'tenant',
      userId: undefined,
    }, 2, 50);
  });
});
