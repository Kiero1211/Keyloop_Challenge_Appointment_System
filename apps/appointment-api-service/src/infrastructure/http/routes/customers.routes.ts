import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateCustomerUseCase } from '@/application/use-cases/crud/customer/create-customer.use-case';
import { GetCustomerUseCase } from '@/application/use-cases/crud/customer/get-customer.use-case';
import { ListCustomersUseCase } from '@/application/use-cases/crud/customer/list-customers.use-case';
import { UpdateCustomerUseCase } from '@/application/use-cases/crud/customer/update-customer.use-case';
import { DeleteCustomerUseCase } from '@/application/use-cases/crud/customer/delete-customer.use-case';
import { createCustomerSchema, updateCustomerSchema } from '@/application/commands/customer.command';
import { tenantContext } from '@/domain/context/tenant-context';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const data = createCustomerSchema.parse(req.body);
    const useCase = new CreateCustomerUseCase(container.customerRepository);
    const result = await useCase.execute(tenantId, data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
    const useCase = new ListCustomersUseCase(container.customerRepository);
    const results = await useCase.execute(tenantId, page, pageSize);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const useCase = new GetCustomerUseCase(container.customerRepository);
    const result = await useCase.execute(tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const data = updateCustomerSchema.parse(req.body);
    const useCase = new UpdateCustomerUseCase(container.customerRepository);
    const result = await useCase.execute(tenantId, req.params.id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const useCase = new DeleteCustomerUseCase(container.customerRepository);
    await useCase.execute(tenantId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const customersRouter = router;
