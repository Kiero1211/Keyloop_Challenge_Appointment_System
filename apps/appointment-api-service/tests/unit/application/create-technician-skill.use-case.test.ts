import { CreateTechnicianSkillUseCase } from '@/application/use-cases/crud/technician-skill/create-technician-skill.use-case';
import { ITechnicianSkillRepository } from '@/application/ports/repositories/technician-skill.repository.port';
import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
import { IServiceTypeRepository } from '@/application/ports/repositories/service-type.repository.port';
import { ConflictException, UnprocessableException } from '@/domain/exceptions';

describe('CreateTechnicianSkillUseCase', () => {
  let mockSkillRepo: ITechnicianSkillRepository;
  let mockTechRepo: ITechnicianRepository;
  let mockTypeRepo: IServiceTypeRepository;
  let useCase: CreateTechnicianSkillUseCase;

  beforeEach(() => {
    mockSkillRepo = {
      create: jest.fn(),
      findByTechnician: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    } as unknown as ITechnicianSkillRepository;
    
    mockTechRepo = { findById: jest.fn() } as unknown as ITechnicianRepository;
    mockTypeRepo = { findById: jest.fn() } as unknown as IServiceTypeRepository;

    useCase = new CreateTechnicianSkillUseCase(mockSkillRepo, mockTechRepo, mockTypeRepo);
  });

  it('should create association successfully', async () => {
    (mockTechRepo.findById as jest.Mock).mockResolvedValue({ id: 'tech-1', tenantId: 'tenant-1' });
    (mockTypeRepo.findById as jest.Mock).mockResolvedValue({ id: 'type-1', tenantId: 'tenant-1' });
    (mockSkillRepo.exists as jest.Mock).mockResolvedValue(false);
    (mockSkillRepo.create as jest.Mock).mockResolvedValue({ id: '1' });

    const result = await useCase.execute('tenant-1', { technicianId: 'tech-1', serviceTypeId: 'type-1' });
    expect(result.id).toBe('1');
  });

  it('should throw UnprocessableException when technician or service type not found', async () => {
    (mockTechRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('tenant-1', { technicianId: 'tech-1', serviceTypeId: 'type-1' }))
      .rejects.toThrow(UnprocessableException);
  });

  it('should throw UnprocessableException on cross-tenant references', async () => {
    (mockTechRepo.findById as jest.Mock).mockResolvedValue({ id: 'tech-1', tenantId: 'tenant-1' });
    (mockTypeRepo.findById as jest.Mock).mockResolvedValue({ id: 'type-1', tenantId: 'tenant-2' });

    await expect(useCase.execute('tenant-1', { technicianId: 'tech-1', serviceTypeId: 'type-1' }))
      .rejects.toThrow(UnprocessableException);
  });

  it('should throw ConflictException on duplicate skill', async () => {
    (mockTechRepo.findById as jest.Mock).mockResolvedValue({ id: 'tech-1', tenantId: 'tenant-1' });
    (mockTypeRepo.findById as jest.Mock).mockResolvedValue({ id: 'type-1', tenantId: 'tenant-1' });
    (mockSkillRepo.exists as jest.Mock).mockResolvedValue(true);

    await expect(useCase.execute('tenant-1', { technicianId: 'tech-1', serviceTypeId: 'type-1' }))
      .rejects.toThrow(ConflictException);
  });
});
