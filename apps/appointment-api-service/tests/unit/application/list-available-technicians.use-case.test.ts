import { ListAvailableTechniciansUseCase } from '@/application/use-cases/crud/technician/list-available-technicians.use-case';
import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
import { ITechnicianSkillRepository } from '@/application/ports/repositories/technician-skill.repository.port';
import { tenantContext } from '@/domain/context/tenant-context';
import { DomainValidationException } from '@/domain/exceptions';

jest.mock('@/domain/context/tenant-context', () => ({
  tenantContext: {
    getStore: jest.fn(),
  },
}));

describe('ListAvailableTechniciansUseCase', () => {
  let useCase: ListAvailableTechniciansUseCase;
  let technicianRepository: jest.Mocked<ITechnicianRepository>;
  let technicianSkillRepository: jest.Mocked<ITechnicianSkillRepository>;

  beforeEach(() => {
    technicianRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findAvailable: jest.fn(),
    };

    technicianSkillRepository = {
      create: jest.fn(),
      findByTechnician: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    useCase = new ListAvailableTechniciansUseCase(technicianRepository, technicianSkillRepository);
    (tenantContext.getStore as jest.Mock).mockReturnValue({ tenantId: 'tenant-1' });
  });

  it('filters out technicians that do not have the requested service skill', async () => {
    technicianRepository.findAvailable.mockResolvedValue([
      { id: 'tech-1' } as any,
      { id: 'tech-2' } as any,
      { id: 'tech-3' } as any,
    ]);
    technicianSkillRepository.exists
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await useCase.execute('2026-06-03T08:00:00.000Z', '2026-06-03T09:00:00.000Z', 'svc-1');

    expect(technicianRepository.findAvailable).toHaveBeenCalledWith(
      'tenant-1',
      new Date('2026-06-03T08:00:00.000Z'),
      new Date('2026-06-03T09:00:00.000Z')
    );
    expect(technicianSkillRepository.exists).toHaveBeenNthCalledWith(1, 'tenant-1', 'tech-1', 'svc-1');
    expect(technicianSkillRepository.exists).toHaveBeenNthCalledWith(2, 'tenant-1', 'tech-2', 'svc-1');
    expect(technicianSkillRepository.exists).toHaveBeenNthCalledWith(3, 'tenant-1', 'tech-3', 'svc-1');
    expect(result.map((tech) => tech.id)).toEqual(['tech-1', 'tech-3']);
  });

  it('returns all available technicians when service type is not provided', async () => {
    technicianRepository.findAvailable.mockResolvedValue([{ id: 'tech-1' } as any]);

    const result = await useCase.execute('2026-06-03T08:00:00.000Z', '2026-06-03T09:00:00.000Z');

    expect(result).toEqual([{ id: 'tech-1' }]);
    expect(technicianSkillRepository.exists).not.toHaveBeenCalled();
  });

  it('throws when tenant context is missing', async () => {
    (tenantContext.getStore as jest.Mock).mockReturnValue(undefined);

    await expect(
      useCase.execute('2026-06-03T08:00:00.000Z', '2026-06-03T09:00:00.000Z', 'svc-1')
    ).rejects.toThrow(DomainValidationException);
  });
});
