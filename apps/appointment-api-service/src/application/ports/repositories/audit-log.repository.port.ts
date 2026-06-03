import { GetAuditLogsQuery } from '@/application/queries/audit-logs.query';

export interface AuditLogView {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  result: unknown;
  timestamp: string;
  user_id: string | null;
}

export interface IAuditLogRepository {
  getLogs(
    tenantId: string | undefined,
    query: GetAuditLogsQuery
  ): Promise<{ data: AuditLogView[]; total: number; page: number; pageSize: number }>;
}
