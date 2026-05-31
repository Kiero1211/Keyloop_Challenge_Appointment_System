import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateVehicleUseCase } from '@/application/use-cases/crud/vehicle/create-vehicle.use-case';
import { GetVehicleUseCase } from '@/application/use-cases/crud/vehicle/get-vehicle.use-case';
import { ListVehiclesUseCase } from '@/application/use-cases/crud/vehicle/list-vehicles.use-case';
import { UpdateVehicleUseCase } from '@/application/use-cases/crud/vehicle/update-vehicle.use-case';
import { DeleteVehicleUseCase } from '@/application/use-cases/crud/vehicle/delete-vehicle.use-case';
import { createVehicleSchema, updateVehicleSchema } from '@/application/commands/vehicle.command';
import { tenantContext } from '@/domain/context/tenant-context';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const data = createVehicleSchema.parse(req.body);
    const useCase = new CreateVehicleUseCase(container.vehicleRepository, container.customerRepository);
    const result = await useCase.execute(tenantId, data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const customerId = req.query.customerId as string | undefined;
    const useCase = new ListVehiclesUseCase(container.vehicleRepository);
    const results = await useCase.execute(tenantId, customerId);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const useCase = new GetVehicleUseCase(container.vehicleRepository);
    const result = await useCase.execute(tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const data = updateVehicleSchema.parse(req.body);
    const useCase = new UpdateVehicleUseCase(container.vehicleRepository);
    const result = await useCase.execute(tenantId, req.params.id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const useCase = new DeleteVehicleUseCase(container.vehicleRepository);
    await useCase.execute(tenantId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const vehiclesRouter = router;
