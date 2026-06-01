# Data Model: Appointment Table Partitioning

## Overview
The `appointments` table is transitioning from a standard, monolithic table into a partitioned table using PostgreSQL's declarative hashing.

## Entity: Appointments

### Physical Schema Adjustments

- **Partitioning Scheme**: `PARTITION BY HASH (tenant_id)`
- **Partition Count**: 64 (partitions 0 through 63)
- **Primary Key**: Changed from `(id)` to `(tenant_id, id)`. This satisfies PostgreSQL's requirement that the partition key is part of the primary key constraint on a partitioned table.

## Entity: All Multi-Tenant Tables (e.g., Customers, Vehicles, Service Bays, etc.)

### Physical Schema Adjustments

- **Primary Key**: Changed from `(id)` to `(tenant_id, id)` for ALL tables that contain a `tenant_id` column.
- **Rationale**: While only `appointments` is currently being partitioned, standardizing the composite primary key across all tenant-aware tables enforces strict multi-tenant boundaries at the physical storage level, optimizes tenant-isolated lookups, and prepares these tables for future horizontal partitioning without requiring additional disruptive primary key migrations.

### Indices

High-value read indices to be created:

1. `(tenant_id, start_time, end_time)` - Supports core time-window overlap checks and daily schedule queries.
2. `(tenant_id, technician_id, start_time, end_time)` - Supports technician availability queries.
3. `(tenant_id, service_bay_id, start_time, end_time)` - Supports physical bay availability queries.
4. `(tenant_id, status)` - Supports querying appointments by their current state (e.g., active vs. canceled).
5. `(tenant_id, id)` - Enforced by the new primary key constraint (automatically handled by the DB).

*Note: The user's original `seed.sql` already contained similar indices. The update to `tables.sql` simply guarantees they are recreated or maintained across all child partitions.*

### Data Routing
- Insertions targeting the `appointments` table will be automatically routed by PostgreSQL to the correct underlying physical partition (`appointments_p000` to `appointments_p063`) based on `hash(tenant_id) % 64`.
- The application layer (ORMs, raw queries) requires no knowledge of the child partitions.
