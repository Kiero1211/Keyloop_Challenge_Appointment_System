import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateTenantUseCase } from '@/application/use-cases/crud/tenant/create-tenant.use-case';
import { GetTenantUseCase } from '@/application/use-cases/crud/tenant/get-tenant.use-case';
import { ListTenantsUseCase } from '@/application/use-cases/crud/tenant/list-tenants.use-case';
import { UpdateTenantUseCase } from '@/application/use-cases/crud/tenant/update-tenant.use-case';
import { DeactivateTenantUseCase } from '@/application/use-cases/crud/tenant/deactivate-tenant.use-case';
import { createTenantSchema, updateTenantSchema } from '@/application/commands/tenant.command';
import { z } from 'zod';
import { jwtAuthMiddleware } from '@/infrastructure/http/middleware/jwt-auth.middleware';
import { adminOnlyMiddleware } from '@/infrastructure/http/middleware/admin-only.middleware';
import { AssignGuestUseCase } from '@/application/use-cases/tenant/assign-guest.use-case';
import { PromoteUserUseCase } from '@/application/use-cases/tenant/promote-user.use-case';
import { GetAuditLogsUseCase } from '@/application/use-cases/tenant/get-audit-logs.use-case';
import { getAuditLogsQuerySchema } from '@/application/queries/audit-logs.query';
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

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['TenantUser', 'TenantManager']),
});

const promoteRoleSchema = z.object({
  role: z.literal('TenantManager'),
});

router.post('/:id/users', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const targetTenantId = req.params.id;
    const data = assignRoleSchema.parse(req.body);

    if (!user.isSuperAdmin && (user.tenantId !== targetTenantId || user.role !== 'TenantManager' || data.role !== 'TenantUser')) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions to assign role' });
    }

    const useCase = new AssignGuestUseCase(container.userRepository, container.userTenantRepository);
    await useCase.execute(data.userId, targetTenantId);
    if (data.role === 'TenantManager') {
      const promoteUseCase = new PromoteUserUseCase(container.userTenantRepository);
      await promoteUseCase.execute(data.userId, targetTenantId);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.put('/:id/users/:userId/role', adminOnly, async (req, res, next) => {
  try {
    const targetTenantId = req.params.id;
    const targetUserId = req.params.userId;
    promoteRoleSchema.parse(req.body);

    const useCase = new PromoteUserUseCase(container.userTenantRepository);
    await useCase.execute(targetUserId, targetTenantId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/:id/audit-logs', adminOnly, async (req, res, next) => {
  try {
    const targetTenantId = req.params.id;
    const query = getAuditLogsQuerySchema.parse(req.query);

    const useCase = new GetAuditLogsUseCase(container.auditLogRepository);
    const result = await useCase.execute(targetTenantId, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export const tenantRouter = router;
