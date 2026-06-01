import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateTechnicianUseCase } from '@/application/use-cases/crud/technician/create-technician.use-case';
import { CreateTechnicianSkillUseCase } from '@/application/use-cases/crud/technician-skill/create-technician-skill.use-case';
import { createTechnicianSchema, updateTechnicianSchema } from '@/application/commands/technician.command';
import { createTechnicianSkillSchema } from '@/application/commands/technician-skill.command';
import { tenantContext } from '@/domain/context/tenant-context';
import { NotFoundException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';
import { Technician } from '@/domain/entities/technician.entity';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const command = createTechnicianSchema.parse(req.body);
    const useCase = new CreateTechnicianUseCase(container.technicianRepository);
    const result = await useCase.execute(tenantId, command);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const results = await container.technicianRepository.findAll(tenantId);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const cacheWrapper = new ReadThroughCacheWrapper<Technician>(container.cacheProvider, 'Technician', 3600);
    const result = await cacheWrapper.get(
      tenantId,
      req.params.id,
      () => container.technicianRepository.findById(tenantId, req.params.id),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        isActive: record.isActive === 'true',
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as Technician)
    );
    if (!result) throw new NotFoundException('Technician not found');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const command = updateTechnicianSchema.parse(req.body);
    const result = await container.technicianRepository.update(tenantId, req.params.id, command);
    if (!result) throw new NotFoundException('Technician not found');
    
    const cacheWrapper = new ReadThroughCacheWrapper<Technician>(container.cacheProvider, 'Technician', 3600);
    await cacheWrapper.invalidate(tenantId, req.params.id);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    await container.technicianRepository.softDelete(tenantId, req.params.id);
    
    const cacheWrapper = new ReadThroughCacheWrapper<Technician>(container.cacheProvider, 'Technician', 3600);
    await cacheWrapper.invalidate(tenantId, req.params.id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Technician Skills sub-routes
router.post('/:id/skills', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const useCase = new CreateTechnicianSkillUseCase(
      container.technicianSkillRepository,
      container.technicianRepository,
      container.serviceTypeRepository
    );
    const command = createTechnicianSkillSchema.parse(req.body);
    const result = await useCase.execute(tenantId, {
      technicianId: req.params.id,
      serviceTypeId: command.serviceTypeId,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/skills/:serviceTypeId', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    await container.technicianSkillRepository.delete(tenantId, req.params.id, req.params.serviceTypeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const techniciansRouter = router;
