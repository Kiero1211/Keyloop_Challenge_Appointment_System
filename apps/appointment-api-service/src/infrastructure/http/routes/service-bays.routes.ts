import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateServiceBayUseCase } from '@/application/use-cases/crud/service-bay/create-service-bay.use-case';
import { createServiceBaySchema, updateServiceBaySchema } from '@/application/commands/service-bay.command';
import { tenantContext } from '@/domain/context/tenant-context';
import { NotFoundException } from '@/domain/exceptions';
import { ServiceBay } from '@/domain/entities/service-bay.entity';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const command = createServiceBaySchema.parse(req.body);
    const useCase = new CreateServiceBayUseCase(container.serviceBayRepository);
    const result = await useCase.execute(tenantId, command);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

import { ListAvailableServiceBaysUseCase } from '@/application/use-cases/crud/service-bay/list-available-service-bays.use-case';

router.get('/', async (req, res, next) => {
  try {
    const { startTime, endTime } = req.query;
    if (startTime && endTime) {
      const useCase = new ListAvailableServiceBaysUseCase(container.serviceBayRepository);
      const results = await useCase.execute(startTime as string, endTime as string);
      res.json(results);
      return;
    }

    const tenantId = tenantContext.getStore()!.tenantId;
    const results = await container.serviceBayRepository.findAll(tenantId);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const result = await container.serviceBayRepository.findById(tenantId, req.params.id);
    if (!result) throw new NotFoundException('Service Bay not found');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const command = updateServiceBaySchema.parse(req.body);
    const result = await container.serviceBayRepository.update(tenantId, req.params.id, command);
    if (!result) throw new NotFoundException('Service Bay not found');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    await container.serviceBayRepository.softDelete(tenantId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const serviceBaysRouter = router;
