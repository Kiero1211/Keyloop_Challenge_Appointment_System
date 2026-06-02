# Feature Specification: API Caching and Small Fixes

**Feature Branch**: `[011-api-caching-fixes]`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "some small fixes - - [ ] Users need a place to see failed appointments - [ ] Get all endpoint should not touch the DB also - [ ] Create Redis set to track individual hashes - [ ] The first time query all, fetch from DB - [ ] Next time get from cache - [ ] On Startup of the api service, run table.sql to initiate the database and then the seed data. (Add on conflict Do nothing). - [ ] Look through the openAPI.yaml file to see any mismatch between the current request model (In the code) and the example request body"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Failed Appointments (Priority: P1)

Users need to be able to identify and view appointments that have failed processing or creation.

**Why this priority**: Users must know if an appointment failed so they can take corrective action. Without visibility into failures, they might assume an appointment is confirmed when it isn't.

**Independent Test**: Can be tested by intentionally failing an appointment and verifying it appears in the failed appointments view.

**Acceptance Scenarios**:

1. **Given** an appointment has failed to process, **When** the user accesses the failed appointments view, **Then** the failed appointment details are visible.
2. **Given** a user is viewing failed appointments, **When** they look at a specific entry, **Then** they can see the relevant reason for failure if applicable.

---

### User Story 2 - Fetch General Entities from Cache (Priority: P1)

When retrieving lists of general entities (excluding audit logs and appointments), the system should serve the response from a cache to reduce database load. The cache will utilize Redis data structures: a Set for tracking the keys of the group of entities, and multiple Hashes to store the individual object rows. Make sure that the request for single entity and multiple entity must hit the same cache (If they hit the same row in db)


**Why this priority**: Retrieving all entities from the database on every request can cause performance bottlenecks. Using a Redis Set and Hashes allows fast lookups for individual rows while reusing the same cache for multiple rows across endpoints.

**Independent Test**: Can be tested by querying a "get all" endpoint for a general entity (e.g., users, technicians) multiple times and verifying that only the first request queries the database while subsequent requests hit the Redis cache structure.

**Acceptance Scenarios**:

1. **Given** the cache is empty for an entity type, **When** a request is made to get all entities, **Then** the system fetches from the database, stores the object rows as Redis Hashes and their keys in a Redis Set, and returns the list.
2. **Given** the cache is populated, **When** a request is made to get all entities, **Then** the system retrieves the list from the cache using the Redis Set and Hashes without querying the database.

---

### User Story 3 - Automatic Database Initialization on Startup (Priority: P2)

When the API service starts, it should automatically ensure that the database schema and seed data are initialized.

**Why this priority**: Ensures that a newly deployed or restarted service has the necessary database structure and seed data to function correctly without manual intervention.

**Independent Test**: Can be tested by starting the API service against an empty database and verifying that tables are created and seed data is populated.

**Acceptance Scenarios**:

1. **Given** an empty database, **When** the API service starts, **Then** the tables are created and seed data is inserted.
2. **Given** a database that already has tables and seed data, **When** the API service starts, **Then** no errors occur and no duplicate seed data is inserted (due to "ON CONFLICT DO NOTHING").

---

### User Story 4 - OpenAPI Specification Consistency (Priority: P3)

The OpenAPI specification file must match the actual request and response models used in the API code.

**Why this priority**: Ensures API documentation is accurate, which is crucial for developers and external clients consuming the API.

**Independent Test**: Can be tested by running a validation tool or manually comparing the code models against the OpenAPI definition.

**Acceptance Scenarios**:

1. **Given** the API code, **When** a developer checks the `openAPI.yaml`, **Then** the models and examples exactly match the code's implementation.

### Edge Cases

- What happens when the Redis cache is unavailable or fails to connect?
- How does system handle cache invalidation when a new appointment is created, updated, or deleted?
- What happens when the startup database scripts fail to execute due to permissions or syntax issues?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an endpoint or view for users to see failed appointments.
- **FR-002**: The GET list endpoints for general entities (excluding audit logs and appointments) MUST fetch data from the database only on the first query.
- **FR-003**: These endpoints MUST utilize a Redis Set to store the group of keys, and multiple Redis Hashes for the individual entity objects, serving subsequent requests from this cache structure.
- **FR-004**: System MUST handle cache misses by falling back to the database and repopulating the Redis Set and Hashes cache structure.
- **FR-005**: The API service MUST execute `table.sql` on startup to initialize the database schema.
- **FR-006**: The API service MUST execute seed data scripts on startup.
- **FR-007**: Seed data insertions MUST use `ON CONFLICT DO NOTHING` or equivalent to prevent duplicate errors on restart.
- **FR-008**: The `openAPI.yaml` specification MUST be synchronized with the current request and response models in the code.

### Key Entities *(include if feature involves data)*

- **Appointment**: The core entity representing a booking, which can now be in a 'failed' state.
- **Cache Entities**: The Redis representation for general entities, consisting of a Set for keys and multiple Hashes for individual objects.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of failed appointments are visible to users.
- **SC-002**: Subsequent requests to GET list endpoints for general entities respond using Redis Sets/Hashes without executing a database query.
- **SC-003**: Service startup successfully prepares an empty database without manual intervention.
- **SC-004**: Zero validation mismatches between API request code models and `openAPI.yaml`.

## Assumptions

- Redis is available and properly configured in the API service environment.
- Cache invalidation logic (if necessary for correctness) is considered or handled by tracking individual hashes.
- Database credentials provided at startup have sufficient privileges to create tables and insert data.
