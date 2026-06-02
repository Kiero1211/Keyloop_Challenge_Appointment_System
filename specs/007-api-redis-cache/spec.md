# Feature Specification: API Redis Read-Through Cache

**Feature Branch**: `007-api-redis-cache`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "The api service should not touch the database all the time, implement a read-through strategy for the read endpoints of all entities (Use Redis Hash data structure). The update endpoints should also update the cache And the delete endpoint should also delete the cache. For the appointments, implement the read-through strategy for 'Completed' or 'Cancelled' ones, but set a time-to-live for 6 hours. The appointments with status 'Scheduled' | 'InProgress' should stay on the cache (You must fix the worker-service if needed) You must unify the status of appointment to 4 state: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Appointment Statuses (Priority: P1)

Ensure that all appointments strictly adhere to one of four unified statuses.

**Why this priority**: The caching logic relies heavily on these specific status strings. Consolidating the statuses is foundational.

**Independent Test**: Can be tested independently by creating/updating appointments with valid statuses and verifying that invalid statuses are rejected.

**Acceptance Scenarios**:

1. **Given** an appointment creation request, **When** the status is one of 'Scheduled', 'InProgress', 'Completed', or 'Cancelled', **Then** the appointment is saved successfully.
2. **Given** an appointment creation request, **When** the status is anything else, **Then** the system returns a validation error.

---

### User Story 2 - General Entity Read-Through Caching (Priority: P2)

Improve read performance for all general entities (e.g., customers, users, vehicles, etc.) by implementing a Redis read-through strategy using the Redis Hash data structure.

**Why this priority**: Core performance optimization across the board.

**Independent Test**: Can be fully tested by reading an entity, verifying it is loaded from the database and saved to Redis, and subsequently observing that follow-up reads hit Redis instead of the database.

**Acceptance Scenarios**:

1. **Given** a read request for an entity not in the cache, **When** the endpoint is called, **Then** the system fetches it from the database, stores it in a Redis Hash with an appropriate Time-To-Live (TTL), and returns it to the client.
2. **Given** a read request for an entity already in the cache, **When** the endpoint is called, **Then** the system returns it from Redis without querying the database.
3. **Given** an update request for an entity, **When** the endpoint is called, **Then** the database is updated and the associated Redis Hash cache is updated immediately.
4. **Given** a delete request for an entity, **When** the endpoint is called, **Then** the entity is deleted from the database and the associated Redis Hash cache is deleted.

---

### User Story 3 - Appointment-Specific TTL Caching (Priority: P3)

Apply specific caching rules for appointments based on their status. 

**Why this priority**: High-volume, status-dependent rules ensuring active appointments remain hot while completed ones expire to free memory.

**Independent Test**: Test by creating appointments of varying statuses and verifying their caching behavior (TTL vs persistent).

**Acceptance Scenarios**:

1. **Given** a 'Completed' or 'Cancelled' appointment, **When** it is cached, **Then** the cache entry is given a TTL of 6 hours.
2. **Given** a 'Scheduled' or 'InProgress' appointment, **When** it is cached, **Then** it stays indefinitely in the cache without expiration.
3. **Given** an appointment changes status from 'InProgress' to 'Completed', **When** the update endpoint is called, **Then** the cache is updated and the TTL of 6 hours is applied to that entry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict appointment statuses to exactly: 'Scheduled', 'InProgress', 'Completed', 'Cancelled'.
- **FR-002**: System MUST use a Redis Hash data structure to store entity caches.
- **FR-003**: System MUST implement a read-through cache for all general entities with an appropriate TTL (cache miss -> read DB -> set cache -> return).
- **FR-004**: System MUST update the Redis cache whenever an entity is updated via an API endpoint.
- **FR-005**: System MUST delete the Redis cache whenever an entity is deleted via an API endpoint.
- **FR-006**: System MUST assign a 6-hour TTL to cached appointments with status 'Completed' or 'Cancelled'.
- **FR-007**: System MUST NOT assign a TTL (or assign infinite TTL) to cached appointments with status 'Scheduled' or 'InProgress'.
- **FR-008**: System MUST update the worker-service if necessary to ensure it respects the new appointment statuses and caching mechanisms.

### Key Entities

- **Appointments**: The primary transactional entity, with new TTL logic applied conditionally based on the `status` field.
- **General Entities (Customers, Vehicles, Service Bays, etc.)**: Standard read-through cache implementation with updates/deletes cascading to Redis.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of read requests for previously fetched entities hit the Redis cache rather than the database (excluding expired cache entries).
- **SC-002**: Database read volume for standard entity queries is reduced by at least 80% under standard traffic patterns.
- **SC-003**: Stale data errors (where cache does not match the database after an update or delete) occur in 0% of API lifecycle tests.
- **SC-004**: System correctly evicts 'Completed' or 'Cancelled' appointments from the cache after 6 hours, while leaving active appointments indefinitely.

## Assumptions

- We assume Redis is already provisioned and accessible by the API service and worker service.
- We assume that the Redis connection library used supports the Hash data structure and TTL expiration per Hash/key.
- We assume cross-service cache invalidation (if other services update the database directly without using the API) is out of scope unless it happens within the specified worker-service.
