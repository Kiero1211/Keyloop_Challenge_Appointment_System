# Implementation Plan: Appointment Table Partitioning

**Branch**: `006-partition-appointments` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-partition-appointments/spec.md`

## Summary

Migrate the `appointments` table to use PostgreSQL hash partitioning on the `tenant_id` column across 64 partitions, apply high-value composite indices to optimize read performance, and universally update the primary key of ALL tenant-aware tables to a composite key `(tenant_id, id)`. This ensures horizontal scalability for multi-tenant data while reinforcing hard data boundaries at the lowest schema level.

## Technical Context

**Language/Version**: PostgreSQL 14+ (or compatible version supporting declarative HASH partitioning)

**Primary Dependencies**: None (purely database level)

**Storage**: PostgreSQL

**Testing**: Manual or automated schema verification

**Target Platform**: PostgreSQL Database

**Project Type**: Database Migration / Schema Update

**Performance Goals**: Fast read access via new indices (e.g., < 100ms for time-window queries); writes should maintain performance with <10% degradation compared to unindexed state.

**Constraints**: PostgreSQL requires that unique constraints and primary keys on partitioned tables include the partition key (`tenant_id`). Therefore, the primary key for `appointments` must be updated from `id` to `(tenant_id, id)`. To maintain strict schema consistency and enable future partitioning on other entities, this compound primary key constraint will be applied universally to all tables possessing a `tenant_id` column.

**Scale/Scope**: 64 partitions for the `appointments` table, plus primary key constraint updates across multiple other domain tables (e.g., customers, vehicles, service_bays).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Multi-Tenancy Isolation**: Passed. Partitioning by `tenant_id` inherently aligns with the constitution's multi-tenancy requirements.
- **Database Isolation**: Passed. The constitution dictates that every table must include a `tenant_id` column and have composite indices `(tenant_id, id)` or `(tenant_id, lookup_column)`. This plan enforces that rule perfectly.
- **Clean Architecture / Role Separation**: Passed. The changes are strictly at the data persistence layer. No application domain logic is altered.

## Project Structure

### Documentation (this feature)

```text
specs/006-partition-appointments/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (future)
```

### Source Code (repository root)

```text
apps/
└── appointment-api-service/
    └── seed/
        ├── tables.sql    # Table definitions, composite PKs, and partition creation
        └── seed.sql      # Seed data inserts for development testing
```

**Structure Decision**: The database schema initialization scripts will be split into two files. `tables.sql` will contain all table definitions, compound primary key configurations, and the partition generation script. `seed.sql` will be strictly reserved for inserting mock/seed data. This isolates structural schema definitions from data population routines.

## Complexity Tracking

No constitution violations present.
