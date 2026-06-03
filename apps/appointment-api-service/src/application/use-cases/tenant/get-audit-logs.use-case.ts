import { IAuditLogRepository } from '@/application/ports/repositories/audit-log.repository.port';
import { GetAuditLogsQuery } from '@/application/queries/audit-logs.query';

export class GetAuditLogsUseCase {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  async execute(tenantId: string | undefined, query: GetAuditLogsQuery) {
    return await this.auditLogRepository.getLogs(tenantId, query);
  }
}
