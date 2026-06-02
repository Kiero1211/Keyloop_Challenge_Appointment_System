import { DrizzleAuditLogRepository } from '@/infrastructure/db/repositories/drizzle-audit-log.repository';
import { GetAuditLogsQuery } from '@/application/queries/audit-logs.query';

export class GetAuditLogsUseCase {
  constructor(private readonly auditLogRepository: DrizzleAuditLogRepository) {}

  async execute(tenantId: string, query: GetAuditLogsQuery) {
    const logs = await this.auditLogRepository.getLogs(tenantId, query);
    return { data: logs };
  }
}
