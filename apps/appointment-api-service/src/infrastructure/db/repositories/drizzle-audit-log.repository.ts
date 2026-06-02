import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { auditLogs } from '@/infrastructure/db/schema';
import { eq, and, gte, lte, count } from 'drizzle-orm';
import { GetAuditLogsQuery } from '@/application/queries/audit-logs.query';

export class DrizzleAuditLogRepository {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async getLogs(tenantId: string | undefined, query: GetAuditLogsQuery) {
    const conditions = [
      gte(auditLogs.timestamp, new Date(query.start_time)),
      lte(auditLogs.timestamp, new Date(query.end_time)),
    ];

    if (tenantId) {
      conditions.push(eq(auditLogs.tenantId, tenantId));
    }

    if (query.entity_type) {
      conditions.push(eq(auditLogs.entityType, query.entity_type));
    }

    if (query.entity_id) {
      conditions.push(eq(auditLogs.entityId, query.entity_id));
    }

    const totalResult = await this.db.select({ count: count() }).from(auditLogs).where(and(...conditions));
    const total = totalResult[0].count;

    const offset = (query.page - 1) * query.pageSize;
    const logs = await this.db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(auditLogs.timestamp)
      .limit(query.pageSize)
      .offset(offset);
    
    return {
      data: logs.map(log => ({
        id: log.id,
        tenant_id: log.tenantId,
        entity_type: log.entityType,
        entity_id: log.entityId,
        action: log.action,
        result: log.result,
        timestamp: log.timestamp.toISOString(),
        user_id: log.userId,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize
    };
  }
}
