# Data Model: Audit Log

## Entities

### `AuditLogEntry`

Represents a single recorded modification action performed on a core entity in the system.

**Fields**:
- `Id` (UUID, Primary Key): Unique identifier for the audit log entry.
- `TenantId` (String/Varchar, Required): The identifier of the tenant the entity belongs to. Used for hash partitioning and data isolation.
- `EntityType` (String/Varchar, Required): The type of the entity that was modified (e.g., 'Appointment', 'Technician').
- `EntityId` (String/Varchar, Required): The unique identifier of the modified entity.
- `Action` (String/Varchar, Required): The type of modification. Enum: `CREATE`, `UPDATE`, `DELETE`.
- `Result` (JSONB, Required): A structured JSON payload capturing the state modification.
  - For `CREATE`: Contains `{new value}`.
  - For `UPDATE`: Contains `{old value and new value}`.
  - For `DELETE`: Contains `{deleted value}`.
- `Timestamp` (DateTimeOffset/Timestamp with Time Zone, Required): The exact time the action occurred.
- `UserId` (String/Varchar, Optional): The identifier of the user who performed the action, if applicable. Will be null for system-automated actions.

**Relationships**:
- Belongs to a Tenant (implicit via `TenantId`).
- Refers to a Core Entity (polymorphic via `EntityType` and `EntityId`).

## Database Schema (PostgreSQL)

The table will be defined in `table.sql` with hash partitioning to fulfill scalability constraints (FR-010).

```sql
CREATE TABLE audit_logs (
    id UUID NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    result JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id VARCHAR(50),
    PRIMARY KEY (id, tenant_id) -- tenant_id required in PK for partitioning
) PARTITION BY HASH (tenant_id);

-- Create partition tables (e.g., 4 partitions)
CREATE TABLE audit_logs_p0 PARTITION OF audit_logs FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE audit_logs_p1 PARTITION OF audit_logs FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE audit_logs_p2 PARTITION OF audit_logs FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE audit_logs_p3 PARTITION OF audit_logs FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Required Indexes (FR-013)
CREATE INDEX idx_audit_logs_tenant_entity ON audit_logs (tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_tenant_timestamp ON audit_logs (tenant_id, timestamp);
```

## Validation Rules

- **Time Range Query Validation**: When querying, the `end_time` minus `start_time` duration must be between 1 hour and 30 days (FR-011).
- **Future Date Adjustment**: If an `end_time` is provided that is in the future relative to the server time, it must automatically be capped to `now()` (FR-012).
