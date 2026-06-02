import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { auditLogs } from '@/infrastructure/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { GetAuditLogsQuery } from '@/application/queries/audit-logs.query';

export class DrizzleAuditLogRepository {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async getLogs(tenantId: string, query: GetAuditLogsQuery) {
    const conditions = [
      eq(auditLogs.tenantId, tenantId),
      gte(auditLogs.timestamp, new Date(query.start_time)),
      lte(auditLogs.timestamp, new Date(query.end_time)),
    ];

    if (query.entity_type) {
      conditions.push(eq(auditLogs.entityType, query.entity_type));
    }

    if (query.entity_id) {
      conditions.push(eq(auditLogs.entityId, query.entity_id));
    }

    const logs = await this.db.select().from(auditLogs).where(and(...conditions)).orderBy(auditLogs.timestamp);
    
    return logs.map(log => ({
      id: log.id,
      tenant_id: log.tenantId,
      entity_type: log.entityType,
      entity_id: log.entityId,
      action: log.action,
      result: log.result,
      timestamp: log.timestamp.toISOString(),
      user_id: log.userId,
    }));
  }
}
