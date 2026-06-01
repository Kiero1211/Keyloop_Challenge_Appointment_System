# Tasks: Partition Appointments & Composite Primary Keys

**Input**: Design documents from `/specs/006-partition-appointments/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Database script**: `apps/appointment-api-service/seed/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and file structure updates

- [X] T001 Setup new file structure by renaming/splitting `apps/appointment-api-service/seed/seed.sql` into `tables.sql` and `seed.sql`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Strip out any data insertion (`INSERT INTO`) statements from `tables.sql` and move them strictly into `seed.sql`.

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Database Scalability and Consistency (Priority: P1) 🎯 MVP

**Goal**: Appointments data partitioned evenly across 64 buckets based on `tenant_id`, and ALL multi-tenant tables adopt a compound primary key `(tenant_id, id)`.

**Independent Test**: Verify compound primary keys are correctly applied to all tenant-aware tables, and verify the 64 partition tables exist via postgres metadata query.

- [X] T013 Final self-audit of all completed tasks. Ensure no `(id)` primary keys are left behind for tenant-aware tables, and partitioning syntax is 100% correct in Postgres 15.

### Implementation for User Story 1

- [X] T003 [US1] Update the primary keys of all tenant-aware tables (e.g., `customers`, `service_bays`, `service_types`, `technicians`, etc.) in `apps/appointment-api-service/seed/tables.sql` from `(id)` to `(tenant_id, id)`.
- [X] T004 [US1] Refactor the `appointments` table definition in `apps/appointment-api-service/seed/tables.sql` to include `PARTITION BY HASH (tenant_id)` with a primary key of `(tenant_id, id)`.
- [X] T005 [US1] Append a PL/pgSQL DO block (or a script to generate partition creation statements) in `apps/appointment-api-service/seed/tables.sql` to generate exactly 64 hash partitions for `appointments`.
- [X] T006 [US1] Review data insertions in `apps/appointment-api-service/seed/seed.sql` to ensure they correctly test cross-tenant and single-tenant insertions that route successfully into the partitioned table.

**Checkpoint**: At this point, User Story 1 should be fully functional and the database schema should correctly generate partitions and route data.

---

## Phase 4: User Story 2 - Database Read Optimization (Priority: P2)

**Goal**: High-value query paths have indices prefixed with `tenant_id`.

**Independent Test**: Use `\d appointments` and check `pg_indexes` to verify that all composite indices are created properly on the parent partitioned table (which automatically cascade down to partitions).

### Implementation for User Story 2

- [X] T007 [P] [US2] Add composite index `(tenant_id, start_time, end_time)` to `apps/appointment-api-service/seed/tables.sql`.
- [X] T008 [P] [US2] Add composite index `(tenant_id, technician_id, start_time, end_time)` to `apps/appointment-api-service/seed/tables.sql`.
- [X] T009 [P] [US2] Add composite index `(tenant_id, service_bay_id, start_time, end_time)` to `apps/appointment-api-service/seed/tables.sql`.
- [X] T010 [P] [US2] Add composite index `(tenant_id, status)` to `apps/appointment-api-service/seed/tables.sql`.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T011 [P] Run local postgres container validation using the test queries provided in `specs/006-partition-appointments/quickstart.md`.
- [ ] T012 Format and lint SQL files in `apps/appointment-api-service/seed/` to maintain clean SQL standards.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Sequential priority order (P1 → P2) since US2 indices depend on the table creation in US1.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 (since the `appointments` table must exist and be partitioned before indices can be tested or reliably added to the schema creation script, though they could be appended to the same file).

### Within Each User Story

- Schema modifications before index additions.
- Story complete before moving to next priority

### Parallel Opportunities

- The indices creation in Phase 4 (User Story 2) are all marked [P] because they are distinct statements and conceptually parallelizable.

---

## Parallel Example: User Story 2

```bash
# Append all indices for User Story 2:
Task: "Add composite index (tenant_id, start_time, end_time)..."
Task: "Add composite index (tenant_id, technician_id, start_time, end_time)..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently by bringing up the DB container and verifying partition tables exist.
5. Merge if ready.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories
