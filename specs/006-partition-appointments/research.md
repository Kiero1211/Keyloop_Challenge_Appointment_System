# Research: Appointment Table Partitioning

## PostgreSQL Partitioning Constraints
## PostgreSQL Partitioning Constraints & Universal Tenancy
- **Decision**: Update the Primary Key for ALL tenant-aware tables (e.g., `appointments`, `customers`, `vehicles`, `service_bays`) from `(id)` to `(tenant_id, id)`.
- **Rationale**: 
  1. PostgreSQL has a strict requirement for declarative partitioning: all unique constraints and primary keys on a partitioned table MUST include the partition key. Because the `appointments` table is partitioned by `tenant_id`, it must be incorporated into the primary key.
  2. To maintain schema consistency and enable future partitioning on other high-volume tables (like `customers` or `vehicles`), we are preemptively applying this compound key `(tenant_id, id)` structure to all tables containing a `tenant_id`. This solidifies the multi-tenant architecture at the lowest database level.
- **Alternatives considered**: Only updating the `appointments` table (rejected because it creates inconsistent primary key patterns across domain entities).

## Partitioning Strategy
- **Decision**: Use `PARTITION BY HASH (tenant_id)` with 64 partitions.
- **Rationale**: As requested by the user, this approach evenly distributes tenant data without the administrative overhead of managing thousands of individual partitions (one per tenant). Hash partitioning perfectly suits this requirement.
- **Alternatives considered**: List partitioning per tenant (rejected per explicit user request).

## Indexing Strategy
- **Decision**: Implement targeted composite indices on:
  1. `(tenant_id, start_time, end_time)` - for timeline/schedule fetching
  2. `(tenant_id, technician_id, start_time, end_time)` - for technician availability checks
  3. `(tenant_id, service_bay_id, start_time, end_time)` - for bay availability checks
  4. `(tenant_id, status)` - for workflow queries (e.g., finding scheduled vs completed appointments)
- **Rationale**: The Constitution states that every table must have composite indices starting with `tenant_id` to prevent full table scans. These indices align with the most common domain read query patterns and ensure they are local to the partition (since they are prefixed by the partition key). 
- **Alternatives considered**: Creating numerous single-column indices (rejected as it causes unacceptable write performance degradation).
