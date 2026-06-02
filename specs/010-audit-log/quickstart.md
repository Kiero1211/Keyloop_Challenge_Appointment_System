# Quickstart: Audit Log Feature

## Overview
The Audit Log feature automatically records creation, update, and deletion actions on core entities directly in PostgreSQL. It bypasses Redis caching for compliance accuracy and uses hash partitioning for scalability.

## Local Testing

1. **Verify Database Initialization**
   Run the database initialization to ensure the `audit_logs` table and its partitions are created:
   ```bash
   docker compose down -v
   docker compose up -d postgres
   ```
   *Wait for PostgreSQL to be ready, then run the DB init script (or just let the normal docker compose start handle it).*

2. **Trigger Audit Logs via API**
   Create an appointment using the API:
   ```bash
   curl -X POST http://localhost:3000/api/v1/tenants/tenant-A/appointments \
     -H "Content-Type: application/json" \
     -d '{
       "vehicle_id": "V1",
       "customer_id": "C1",
       "service_type_id": "ST1",
       "desired_start_time": "2026-10-10T10:00:00Z"
     }'
   ```
   *This request creates a core entity. The worker service processes this and creates an `AuditLogEntry` in PostgreSQL.*

3. **Query the Audit Logs**
   Use the new audit logs endpoint (assuming it is mapped to `/api/v1/tenants/:tenantId/audit-logs`):
   ```bash
   curl "http://localhost:3000/api/v1/tenants/tenant-A/audit-logs?start_time=2026-10-01T00:00:00Z&end_time=2026-10-11T00:00:00Z"
   ```
   *You should see the `CREATE` action with the new values in the `result` field. This bypasses the Redis cache completely.*

## Development Guide
- **C# Worker**: Look at `IAuditLogRepository` and how it is injected. When saving an entity, we also add an `AuditLogEntry` object to `AppDbContext`.
- **Node.js API**: Look at the `GetAuditLogsUseCase` and `DrizzleAuditLogRepository`. The repository uses a direct database query instead of the Redis caching abstraction.
