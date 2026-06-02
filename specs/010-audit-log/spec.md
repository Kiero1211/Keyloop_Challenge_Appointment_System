# Feature Specification: Audit Log

**Feature Branch**: `010-audit-log`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "audit-log feature: Have audit log for every creation, update, delete on the core entities. Each row should have action, result: {old value and new value} for update, {new value} for create, {deleted value} for delete. Don’t need audit log for Read endpoints. Audit log should not be cached on read (not like other general entities). Create partition for the table, partitioned by hash of tenant_id like the ‘appointments’ table ⇒ Update the table.sql script"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Audit Data Modifications (Priority: P1)

As a system administrator or compliance officer, I want the system to automatically record all modifications (create, update, delete) to core entities so that there is a reliable history of who changed what and when.

**Why this priority**: Core compliance requirement and the foundation of the audit logging feature.

**Independent Test**: Can be fully tested by creating, updating, and deleting core entities and verifying that the correct entries appear in the audit log database with the correct structure.

**Acceptance Scenarios**:

1. **Given** a new entity is created, **When** the creation transaction commits, **Then** an audit log entry is recorded with action "CREATE" and the new values in the result payload.
2. **Given** an existing entity is updated, **When** the update transaction commits, **Then** an audit log entry is recorded with action "UPDATE" and both old and new values in the result payload.
3. **Given** an existing entity is deleted, **When** the deletion transaction commits, **Then** an audit log entry is recorded with action "DELETE" and the deleted values in the result payload.
4. **Given** an entity is only read, **When** the read request completes, **Then** no audit log entry is recorded.

---

### User Story 2 - Retrieve Audit History without caching (Priority: P2)

As a compliance officer viewing audit logs, I want to retrieve the audit history in real-time without caching in Redis, so that I always see the most accurate and up-to-date data.

**Why this priority**: Caching audit logs could lead to serving stale compliance data, which defeats the purpose of accurate security auditing.

**Independent Test**: Can be fully tested by reading audit logs twice in succession and ensuring the database is queried directly both times, bypassing the standard Redis entity caching layer.

**Acceptance Scenarios**:

1. **Given** a request to read audit logs, **When** the request is processed, **Then** the results are fetched directly from the database without checking or updating the Redis cache.
2. **Given** a request to read audit logs with a start time and end time, **When** the duration spans between 1 hour and 30 days, **Then** the audit logs within that period are successfully returned.
3. **Given** a request to read audit logs with a start time and end time, **When** the duration is outside the 1 hour to 30 days range, **Then** the request is rejected with a validation error.
4. **Given** a request to read audit logs with an end time in the future, **When** the request is processed, **Then** the end time is automatically set to the current time (`now()`).

---

### User Story 3 - Multi-tenant Scalability (Priority: P2)

As a database administrator, I want the audit log table to be partitioned by `tenant_id` hash, so that query performance and data management scale efficiently across tenants.

**Why this priority**: Audit logs grow rapidly; partitioning prevents performance degradation as the dataset size increases.

**Independent Test**: Can be fully tested by verifying the database schema definition (`table.sql`) and ensuring inserts correctly route to the appropriate tenant partitions.

**Acceptance Scenarios**:

1. **Given** the database initialization script runs, **When** the tables are created, **Then** the audit log table includes hash partitioning by `tenant_id`.

### Edge Cases

- What happens if the database transaction for the core entity succeeds but writing the audit log fails? (Assumption: They share the same transaction to maintain consistency).
- What happens if the payload size for a large entity exceeds standard column limits in the audit log table?
- How does the system handle bulk updates or deletions? (Does it create one log entry per entity or a single bulk log entry?)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record an audit log entry whenever a core entity is created.
- **FR-002**: System MUST record an audit log entry whenever a core entity is updated.
- **FR-003**: System MUST record an audit log entry whenever a core entity is deleted.
- **FR-004**: System MUST NOT record an audit log entry for read-only operations on core entities.
- **FR-005**: System MUST store the action type (CREATE, UPDATE, DELETE) in each audit log entry.
- **FR-006**: For CREATE actions, the audit log MUST store the new entity state as `{new value}`.
- **FR-007**: For UPDATE actions, the audit log MUST store both the previous and new entity states as `{old value and new value}`.
- **FR-008**: For DELETE actions, the audit log MUST store the previous entity state as `{deleted value}`.
- **FR-009**: System MUST bypass the Redis caching layer entirely when reading from the audit log repository.
- **FR-010**: The database schema MUST define the audit log table with hash partitioning on the `tenant_id` column, matching the strategy used for the `appointments` table.
- **FR-011**: System MUST support querying audit logs by a time range (`start_time` and `end_time`) that spans between 1 hour and 30 days.
- **FR-012**: System MUST automatically adjust any `end_time` in the future to the current time (`now()`).
- **FR-013**: The database schema MUST include an index on `(tenant_id, entity_type, entity_id)` and an index on `(tenant_id, timestamp)` to optimize query performance for audit history retrieval.

### Key Entities *(include if feature involves data)*

- **Audit Log Entry**: Represents a single recorded action. Contains attributes such as:
  - `tenant_id` (used for hash partitioning)
  - `entity_type` (e.g., appointment, technician)
  - `entity_id`
  - `action` (CREATE, UPDATE, DELETE)
  - `result` (JSON payload containing old/new state)
  - `timestamp`
  - `user_id` (actor who performed the action)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of data modifications on core entities result in a corresponding, correct audit log entry.
- **SC-002**: Audit log read requests reflect new data with 0ms cache staleness (no caching).
- **SC-003**: The audit log table is successfully created with hash partitioning during schema initialization.

## Assumptions

- We assume that the audit log writes will occur within the same database transaction as the entity modifications to ensure data consistency.
- We assume that the application will serialize the entity state to a structured format (e.g., JSON) before saving it to the `result` column.
- We assume the existing mechanism for fetching the current user and tenant is available to enrich the audit log context.
