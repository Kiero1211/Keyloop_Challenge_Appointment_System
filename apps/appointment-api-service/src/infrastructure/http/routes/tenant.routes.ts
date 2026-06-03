import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateTenantUseCase } from '@/application/use-cases/crud/tenant/create-tenant.use-case';
import { GetTenantUseCase } from '@/application/use-cases/crud/tenant/get-tenant.use-case';
import { ListTenantsUseCase } from '@/application/use-cases/crud/tenant/list-tenants.use-case';
import { UpdateTenantUseCase } from '@/application/use-cases/crud/tenant/update-tenant.use-case';
import { DeactivateTenantUseCase } from '@/application/use-cases/crud/tenant/deactivate-tenant.use-case';
import { createTenantSchema, updateTenantSchema } from '@/application/commands/tenant.command';
import { jwtAuthMiddleware } from '@/infrastructure/http/middleware/jwt-auth.middleware';
import { adminOnlyMiddleware } from '@/infrastructure/http/middleware/admin-only.middleware';
const router = Router();

router.use((req, res, next) => jwtAuthMiddleware(container.jwtService)(req, res, next));

// Apply admin only to the standard CRUD routes
const adminOnly = adminOnlyMiddleware;

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const data = createTenantSchema.parse(req.body);
    const useCase = new CreateTenantUseCase(container.tenantRepository);
    const result = await useCase.execute(data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', adminOnly, async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
    const useCase = new ListTenantsUseCase(container.tenantRepository);
    const results = await useCase.execute(page, pageSize);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', adminOnly, async (req, res, next) => {
  try {
    const useCase = new GetTenantUseCase(container.tenantRepository);
    const result = await useCase.execute(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const data = updateTenantSchema.parse(req.body);
    const useCase = new UpdateTenantUseCase(container.tenantRepository);
    const result = await useCase.execute(req.params.id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const useCase = new DeactivateTenantUseCase(container.tenantRepository);
    await useCase.execute(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const tenantRouter = router;
