import { GetAppointmentDetailUseCase } from '@/application/use-cases/crud/appointment/get-appointment-detail.use-case';
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { NotFoundException } from '@/domain/exceptions';

describe('GetAppointmentDetailUseCase', () => {
  let useCase: GetAppointmentDetailUseCase;
  let mockRepo: jest.Mocked<IAppointmentCrudRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
      findOverlapping: jest.fn(),
    } as any;
    // We would need to mock the getDetail method which might be a new method on the repo
    (mockRepo as any).findDetailById = jest.fn();
    useCase = new GetAppointmentDetailUseCase(mockRepo as any);
  });

  it('should throw NotFoundException if not found', async () => {
    (mockRepo as any).findDetailById.mockResolvedValue(null);
    await expect(useCase.execute('tenant1', 'app1')).rejects.toThrow(NotFoundException);
  });

  it('should return enriched detail', async () => {
    const detail = { id: 'app1', customerName: 'John' };
    (mockRepo as any).findDetailById.mockResolvedValue(detail);
    const result = await useCase.execute('tenant1', 'app1');
    expect(result).toEqual(detail);
  });
});
