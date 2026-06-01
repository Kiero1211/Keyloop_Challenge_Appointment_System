import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateServiceTypeUseCase } from '@/application/use-cases/crud/service-type/create-service-type.use-case';
import { DeleteServiceTypeUseCase } from '@/application/use-cases/crud/service-type/delete-service-type.use-case';
import { createServiceTypeSchema, updateServiceTypeSchema } from '@/application/commands/service-type.command';
import { tenantContext } from '@/domain/context/tenant-context';
import { NotFoundException } from '@/domain/exceptions';
import { ReadThroughCacheWrapper } from '@/application/use-cases/cache/read-through-cache.wrapper';
import { ServiceType } from '@/domain/entities/service-type.entity';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const command = createServiceTypeSchema.parse(req.body);
    const useCase = new CreateServiceTypeUseCase(container.serviceTypeRepository);
    const result = await useCase.execute(tenantId, command);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const results = await container.serviceTypeRepository.findAll(tenantId);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const cacheWrapper = new ReadThroughCacheWrapper<ServiceType>(container.cacheProvider, 'ServiceType', 3600);
    const result = await cacheWrapper.get(
      tenantId,
      req.params.id,
      () => container.serviceTypeRepository.findById(tenantId, req.params.id),
      (record) => ({
        id: record.id,
        tenantId: record.tenantId,
        name: record.name,
        estimatedDurationMinutes: parseInt(record.estimatedDurationMinutes, 10),
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      } as ServiceType)
    );
    if (!result) throw new NotFoundException('Service Type not found');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const command = updateServiceTypeSchema.parse(req.body);
    const result = await container.serviceTypeRepository.update(tenantId, req.params.id, command);
    if (!result) throw new NotFoundException('Service Type not found');
    
    const cacheWrapper = new ReadThroughCacheWrapper<ServiceType>(container.cacheProvider, 'ServiceType', 3600);
    await cacheWrapper.invalidate(tenantId, req.params.id);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    // In a real app we might inject this, but we'll instantiate here for simplicity
    const useCase = new DeleteServiceTypeUseCase(container.serviceTypeRepository, container.appointmentCrudRepository);
    await useCase.execute(tenantId, req.params.id);
    
    const cacheWrapper = new ReadThroughCacheWrapper<ServiceType>(container.cacheProvider, 'ServiceType', 3600);
    await cacheWrapper.invalidate(tenantId, req.params.id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const serviceTypesRouter = router;
