# Research: Audit Log Implementation

## Needs Clarification Resolutions

### 1. What happens if the database transaction for the core entity succeeds but writing the audit log fails?
**Decision**: Audit log writes will be executed in the exact same database transaction as the core entity modifications.
**Rationale**: The C# Worker Service utilizes Entity Framework Core (`AppDbContext`). By ensuring that `AuditLogEntry` instances are added to the same `DbContext` before `SaveChangesAsync()` is invoked, both the entity modification and the audit log creation are wrapped in a single implicit transaction. This guarantees atomic consistency: if the audit log insertion fails, the entity modification will be rolled back automatically.
**Alternatives considered**: Using an out-of-box outbox pattern or separate transaction. Rejected because strict immediate consistency is required for compliance audit trails.

### 2. What happens if the payload size for a large entity exceeds standard column limits in the audit log table?
**Decision**: The `result` column in the audit log table will use PostgreSQL's `jsonb` data type.
**Rationale**: PostgreSQL `jsonb` supports up to 1GB of data per column value. This is orders of magnitude larger than any expected entity payload in the system, preventing any truncation issues for large entities. It also enables efficient querying if we need to search within the audit payload later.
**Alternatives considered**: Storing as `text` or `varchar`. Rejected because `jsonb` provides structural validation and query capabilities.

### 3. How does the system handle bulk updates or deletions? (Does it create one log entry per entity or a single bulk log entry?)
**Decision**: The system will create exactly one audit log entry per core entity modified.
**Rationale**: The current architecture processes commands from Redis streams individually (e.g., one `AppointmentMessage` at a time). For any future bulk operations, generating one log entry per entity remains the standard compliance pattern, as it allows clean auditing of what happened to each specific entity.
**Alternatives considered**: Aggregating bulk operations into a single summary log. Rejected because it breaks the `entity_id` traceability required by FR-013 indexing.

## Best Practices & Patterns

### Bypassing Cache for Audit Logs
**Decision**: The Appointment API Service will query the PostgreSQL database directly for audit logs, bypassing the standard Redis entity cache.
**Rationale**: FR-009 mandates bypassing the Redis caching layer to ensure real-time accuracy. We will introduce a direct `pg` or `drizzle` query path in the API service specifically for audit logs.

### Hash Partitioning by Tenant ID
**Decision**: The schema (`table.sql`) will define the audit logs table using `PARTITION BY HASH (tenant_id)`.
**Rationale**: This mirrors the existing strategy for the `appointments` table and fulfills FR-010. Hash partitioning evenly distributes tenant data across partition tables, ensuring scalable insert and query performance as the log volume grows.
