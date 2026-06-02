import { DrizzleAuditLogRepository } from '@/infrastructure/db/repositories/drizzle-audit-log.repository';
import { GetAuditLogsQuery } from '@/application/queries/audit-logs.query';

export class GetAuditLogsUseCase {
  constructor(private readonly auditLogRepository: DrizzleAuditLogRepository) {}

  async execute(tenantId: string | undefined, query: GetAuditLogsQuery) {
    return await this.auditLogRepository.getLogs(tenantId, query);
  }
}
