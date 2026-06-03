import { Router } from 'express';
import { z } from 'zod';
import { container } from '@/infrastructure/di/container';
import { tenantContext } from '@/domain/context/tenant-context';
import { ListTenantUsersUseCase } from '@/application/use-cases/tenant/list-tenant-users.use-case';
import { AssignGuestUseCase } from '@/application/use-cases/tenant/assign-guest.use-case';
import { PromoteUserUseCase } from '@/application/use-cases/tenant/promote-user.use-case';
import { ForbiddenException } from '@/domain/exceptions';

const router = Router();

const assignUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['TenantUser', 'TenantManager']).default('TenantUser'),
});

const promoteUserSchema = z.object({
  role: z.literal('TenantManager'),
});

router.get('/', async (req, res, next) => {
  try {
    const context = tenantContext.getStore();
    const tenantId = context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing x-tenant-id header' });
    }

    const useCase = new ListTenantUsersUseCase(container.userRepository);
    const users = await useCase.execute(tenantId);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const context = tenantContext.getStore();
    const tenantId = context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing x-tenant-id header' });
    }

    const data = assignUserSchema.parse(req.body);
    if (!context?.isSuperAdmin && context?.role !== 'TenantManager' && context?.role !== 'Admin') {
      throw new ForbiddenException('Insufficient permissions to assign tenant users');
    }

    const useCase = new AssignGuestUseCase(container.userRepository, container.userTenantRepository);
    await useCase.execute(data.userId, tenantId);

    if (data.role === 'TenantManager') {
      const promoteUseCase = new PromoteUserUseCase(container.userTenantRepository);
      await promoteUseCase.execute(data.userId, tenantId);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.put('/:userId/role', async (req, res, next) => {
  try {
    const context = tenantContext.getStore();
    const tenantId = context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing x-tenant-id header' });
    }

    const data = promoteUserSchema.parse(req.body);
    if (!context?.isSuperAdmin && context?.role !== 'TenantManager' && context?.role !== 'Admin') {
      throw new ForbiddenException('Insufficient permissions to update tenant user role');
    }

    const useCase = new PromoteUserUseCase(container.userTenantRepository);
    await useCase.execute(req.params.userId, tenantId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const usersRouter = router;
