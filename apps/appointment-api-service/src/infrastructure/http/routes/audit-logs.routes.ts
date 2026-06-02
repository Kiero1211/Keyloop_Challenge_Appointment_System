import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { GetAuditLogsUseCase } from '@/application/use-cases/tenant/get-audit-logs.use-case';
import { getAuditLogsQuerySchema } from '@/application/queries/audit-logs.query';
import { tenantContext } from '@/domain/context/tenant-context';
import { adminOnlyMiddleware } from '@/infrastructure/http/middleware/admin-only.middleware';

const router = Router();

router.get('/', adminOnlyMiddleware, async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()?.tenantId;
    const query = getAuditLogsQuerySchema.parse(req.query);

    const useCase = new GetAuditLogsUseCase(container.auditLogRepository);
    const result = await useCase.execute(tenantId, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export const auditLogsRouter = router;
