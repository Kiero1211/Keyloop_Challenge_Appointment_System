import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateTechnicianUseCase } from '@/application/use-cases/crud/technician/create-technician.use-case';
import { CreateTechnicianSkillUseCase } from '@/application/use-cases/crud/technician-skill/create-technician-skill.use-case';
import { createTechnicianSchema, updateTechnicianSchema } from '@/application/commands/technician.command';
import { createTechnicianSkillSchema } from '@/application/commands/technician-skill.command';
import { tenantContext } from '@/domain/context/tenant-context';
import { NotFoundException } from '@/domain/exceptions';
import { GetTechnicianOccupiedSlotsUseCase } from '@/application/use-cases/get-technician-occupied-slots.use-case';


const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId as string;
    const command = createTechnicianSchema.parse(req.body);
    const useCase = new CreateTechnicianUseCase(container.technicianRepository);
    const result = await useCase.execute(tenantId, command);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

import { ListAvailableTechniciansUseCase } from '@/application/use-cases/crud/technician/list-available-technicians.use-case';

router.get('/', async (req, res, next) => {
  try {
    const { startTime, endTime } = req.query;
    if (startTime && endTime) {
      const useCase = new ListAvailableTechniciansUseCase(container.technicianRepository);
      const results = await useCase.execute(startTime as string, endTime as string);
      res.json(results);
      return;
    }

    const tenantId = tenantContext.getStore()!.tenantId as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
    const results = await container.technicianRepository.findAll(tenantId, page, pageSize);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/occupied', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId as string;
    const useCase = new GetTechnicianOccupiedSlotsUseCase(container.cacheProvider);
    const result = await useCase.execute(tenantId, req.params.id, req.query.date as string | undefined);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId as string;
    const result = await container.technicianRepository.findById(tenantId, req.params.id);
    if (!result) throw new NotFoundException('Technician not found');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId as string;
    const command = updateTechnicianSchema.parse(req.body);
    const result = await container.technicianRepository.update(tenantId, req.params.id, command);
    if (!result) throw new NotFoundException('Technician not found');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId as string;
    await container.technicianRepository.softDelete(tenantId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Technician Skills sub-routes
router.post('/:id/skills', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId as string;
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
    const tenantId = tenantContext.getStore()!.tenantId as string;
    await container.technicianSkillRepository.delete(tenantId, req.params.id, req.params.serviceTypeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const techniciansRouter = router;
