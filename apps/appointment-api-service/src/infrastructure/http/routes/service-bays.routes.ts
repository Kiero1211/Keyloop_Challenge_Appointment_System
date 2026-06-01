import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateServiceBayUseCase } from '@/application/use-cases/crud/service-bay/create-service-bay.use-case';
import { createServiceBaySchema, updateServiceBaySchema } from '@/application/commands/service-bay.command';
import { tenantContext } from '@/domain/context/tenant-context';
import { NotFoundException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';
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

router.get('/', async (req, res, next) => {
  try {
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
    const cacheWrapper = new ReadThroughCacheWrapper<ServiceBay>(container.cacheProvider, 'ServiceBay', 3600);
    const result = await cacheWrapper.get(
      tenantId,
      req.params.id,
      () => container.serviceBayRepository.findById(tenantId, req.params.id),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        name: record.name,
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as ServiceBay)
    );
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
    
    const cacheWrapper = new ReadThroughCacheWrapper<ServiceBay>(container.cacheProvider, 'ServiceBay', 3600);
    await cacheWrapper.invalidate(tenantId, req.params.id);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    await container.serviceBayRepository.softDelete(tenantId, req.params.id);
    
    const cacheWrapper = new ReadThroughCacheWrapper<ServiceBay>(container.cacheProvider, 'ServiceBay', 3600);
    await cacheWrapper.invalidate(tenantId, req.params.id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const serviceBaysRouter = router;
