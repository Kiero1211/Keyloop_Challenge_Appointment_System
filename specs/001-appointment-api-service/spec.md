# Feature Specification: Appointment API Service — Ingestion Layer

**Feature Branch**: `001-appointment-api-service`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "appointment api service - Let's build the `apps/appointment-api-service/` layer using TypeScript, Node.js, and Express. Implement a deterministic consistent hashing function `f(tenant_id, vehicle_id) → partition_id` and a `POST /api/v1/appointments` endpoint that validates payload, writes an idempotency hash to Redis Cache, computes the target Redis Stream partition, and publishes the appointment command."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Submit an Appointment Request (Priority: P1)

A service advisor or customer-facing portal submits a new appointment booking request on behalf of a tenant. The system immediately acknowledges the request, prevents duplicate submissions from the same vehicle within the same tenant in a short window, and queues the booking command for asynchronous processing.

**Why this priority**: This is the core purpose of the ingestion layer. Without reliable command intake and duplicate suppression, the entire pipeline is broken. Every other component depends on this working first.

**Independent Test**: Can be fully tested by sending a `POST /api/v1/appointments` request with a valid payload. The test passes if (a) the response returns `202 Accepted` with a `commandId`, (b) a pending hash record exists in the cache under the expected key, and (c) the compiled command appears in one of the four stream partitions.

**Acceptance Scenarios**:

1. **Given** a valid appointment payload with `tenant_id`, `customer_id`, `vehicle_id`, `service_type_id`, and `desired_start_time`, **When** `POST /api/v1/appointments` is called, **Then** the system responds `202 Accepted` with a `commandId` and `partitionId`, and the command is enqueued into the correct stream partition.

2. **Given** the same `tenant_id` + `vehicle_id` combination is resubmitted within the idempotency window, **When** `POST /api/v1/appointments` is called again, **Then** the system responds `409 Conflict` without enqueuing a duplicate command and without creating a second stream message.

3. **Given** a payload with a missing or empty `tenant_id`, **When** `POST /api/v1/appointments` is called, **Then** the system responds `400 Bad Request` with a descriptive validation error and no stream message is published.

---

### User Story 2 — Deterministic Stream Partition Selection (Priority: P2)

The system must consistently route booking commands for the same `tenant_id` + `vehicle_id` pair to the same Redis Stream partition, regardless of when or from which instance the request is received.

**Why this priority**: Deterministic partitioning is the foundational guarantee of ordered processing for the same vehicle across distributed worker consumers. Without it, race conditions in the worker layer may corrupt appointment state.

**Independent Test**: Can be verified by submitting ten requests with the same `tenant_id` and `vehicle_id` (clearing the idempotency window between each) and confirming all ten land in the same numbered stream partition. A separate pair with different inputs can be verified to produce a different partition.

**Acceptance Scenarios**:

1. **Given** identical `tenant_id` and `vehicle_id` values, **When** the partition hashing function is invoked multiple times (from any instance), **Then** it always returns the same partition number between 0 and 3 (inclusive).

2. **Given** two different `vehicle_id` values under the same `tenant_id`, **When** the partition function is invoked, **Then** the distribution across partitions is roughly uniform (no single partition receives more than 70% of requests in a balanced test set of 100+ inputs).

---

### User Story 3 — Idempotency Protection via Appointment Hash (Priority: P3)

When a caller submits an appointment request for a vehicle that already has a known pending booking record stored in the cache, the system protects against duplicate command submission by rejecting the new request at the ingestion boundary — before the command reaches the stream. The rejection is based purely on the existence of an appointment hash for that vehicle, not on any time window or TTL.

**Why this priority**: This prevents conflicting commands for the same vehicle from accumulating in the worker queue. The hash record is the source of truth for "a booking is already in flight for this vehicle"; any duplicate must be rejected unconditionally until the downstream worker removes the record after processing.

**Independent Test**: Can be tested by submitting two requests for the same `tenant_id` + `vehicle_id`. The second request must receive `409 Conflict` regardless of how quickly it arrives. Once the cache record for that vehicle is manually deleted (simulating worker completion), the same request should be accepted and enqueued normally.

**Acceptance Scenarios**:

1. **Given** an appointment hash record exists under `tenant:{tenant_id}:appointment:{vehicle_id}`, **When** a new request arrives for the same `tenant_id` + `vehicle_id`, **Then** the system responds `409 Conflict` with a message indicating a booking record already exists for that vehicle, and no stream message is published.

2. **Given** no appointment hash record exists for a `tenant_id` + `vehicle_id` pair, **When** a valid request arrives, **Then** the system writes the full appointment snapshot to the cache, publishes the command to the stream, and returns `202 Accepted`.

3. **Given** a previously existing appointment hash record has been explicitly removed (e.g., by the worker after processing), **When** a new request arrives for the same `tenant_id` + `vehicle_id`, **Then** the system accepts it, writes a new appointment hash, and enqueues the command normally.

---

### Edge Cases

- What happens when Redis is temporarily unavailable — does the endpoint fail open or closed?
- How does the system handle a `desired_start_time` in the past?
- What if `service_type_id` is provided but does not correspond to any known service in the catalogue?
- What happens when the stream partition target is unreachable (Redis Streams failure)?
- How does the system behave when `vehicle_id` is not provided (e.g., a walk-in with no vehicle record yet)?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a `POST /api/v1/appointments` endpoint that accepts and validates inbound appointment requests.
- **FR-002**: The system MUST reject any request missing `tenant_id`, and return a `400 Bad Request` response immediately.
- **FR-003**: The system MUST validate that `tenant_id`, `customer_id`, `vehicle_id`, and `service_type_id` are present and non-empty strings, and that `desired_start_time` is a valid future ISO 8601 datetime; invalid payloads MUST return `400 Bad Request` with a structured error body.
- **FR-004**: The system MUST write a full appointment snapshot record (the "appointment hash") to the cache under the key layout `tenant:{tenant_id}:appointment:{vehicle_id}` before publishing any stream message. The record MUST include all known booking fields present in the inbound request: `commandId`, `tenantId`, `customerId`, `vehicleId`, `serviceTypeId`, `desiredStartTime`, `source`, and `timestamp`. Fields that are not yet known at intake time — such as `technicianId`, `bayId`, and `workshopId` — MUST be stored as absent (null/omitted); they are populated later by the worker service.
- **FR-005**: The system MUST check for an existing appointment hash record for the `tenant_id` + `vehicle_id` pair before publishing; if a record exists, the system MUST return `409 Conflict` without publishing to the stream. The check is based solely on record existence — no TTL or time window is evaluated.
- **FR-006**: The system MUST implement a deterministic consistent hashing function `f(tenant_id, vehicle_id) → partition_id` that returns a stable integer in the range `[0, N-1]`, where N defaults to 4.
- **FR-007**: The system MUST publish the compiled appointment command to the Redis Stream partition identified by `f(tenant_id, vehicle_id)`, using the stream naming convention `appointments_stream_{partition_id}`.
- **FR-008**: The published stream message MUST include: `commandId` (UUID, generated per request), `tenantId`, `customerId`, `vehicleId`, `serviceTypeId`, `desiredStartTime`, `partitionId`, `source` (set to `"admin"`), and a `timestamp` (ISO 8601). Fields not yet available (`technicianId`, `bayId`, `workshopId`) are omitted from the stream message.
- **FR-009**: A successful enqueue MUST return `202 Accepted` with a response body containing `commandId` and `partitionId`.
- **FR-010**: The service MUST be stateless in its application logic — all state is held in Redis only.
- **FR-011**: The system MUST propagate `tenant_id` via async context internally rather than threading it as an explicit parameter through all function calls.
- **FR-012**: The endpoint MUST expose a health check route at `GET /health` returning `200 OK` when the service and its Redis dependency are reachable.
- **FR-013**: The web server MUST be capable of handling multiple concurrent inbound requests without one request blocking another. The server process MUST be designed to run across multiple OS workers or threads so that a single slow Redis operation does not stall unrelated requests.

### Key Entities

- **AppointmentCommand**: The compiled message published to the Redis Stream. Contains routing metadata (`commandId`, `partitionId`, `tenantId`) and all known booking intent fields at intake time (`customerId`, `vehicleId`, `serviceTypeId`, `desiredStartTime`, `source`, `timestamp`). Fields resolved later by the worker (`technicianId`, `bayId`, `workshopId`) are absent.
- **AppointmentHash**: A cache record stored per vehicle per tenant under `tenant:{tenantId}:appointment:{vehicleId}`. Holds the full appointment snapshot as known at intake: all required booking fields plus null placeholders for as-yet-unresolved resources (technician, bay, workshop). Its existence is the sole guard against duplicate submission — there is no TTL-based expiry.
- **StreamPartition**: A logical Redis Stream named `appointments_stream_{0..N-1}`. Receives serialised `AppointmentCommand` messages for consumption by the worker service.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid appointment request receives a `202 Accepted` response within 200 ms under normal load (single instance, unloaded Redis).
- **SC-002**: Duplicate requests for the same vehicle are rejected with `409 Conflict` 100% of the time whenever an appointment hash record exists for that vehicle — no duplicate stream messages are ever published while the record is present, regardless of request timing.
- **SC-003**: The partition function produces a uniform distribution: in a balanced test of 1,000 diverse `(tenant_id, vehicle_id)` pairs, no single partition receives more than 30% of the assignments.
- **SC-004**: The service sustains at least 500 concurrent appointment submission requests simultaneously across a multi-worker deployment without error rates exceeding 0.1%, and individual requests do not queue behind one another due to blocking I/O.
- **SC-005**: All requests missing a required field return a `400 Bad Request` response within 50 ms without touching Redis or the stream.
- **SC-006**: The health check endpoint returns `200 OK` when Redis is reachable and `503 Service Unavailable` when Redis is unreachable.

---

## Assumptions

- Redis is always available as both a cache and a Streams broker; no fallback to an alternative message queue is required in v1.
- The number of stream partitions `N` is fixed at 4 for v1 and is configurable only via an environment variable; runtime re-partitioning is out of scope.
- `vehicle_id` will always be provided in v1 of this endpoint; the walk-in (no vehicle) scenario is deferred to a future iteration.
- The service does not perform authentication itself; a reverse proxy or API gateway upstream is responsible for authenticating callers.
- `desired_start_time` must be in the future relative to the server's clock; the tolerance window (e.g., ±30s for clock skew) is not specified and will default to strict future-only validation.
- The appointment hash record has no TTL — it persists in the cache until the downstream worker explicitly removes it upon completing or rejecting the booking. This means a vehicle with a failed or stuck worker job will remain blocked until manual intervention or worker recovery.
- The server is expected to run as multiple concurrent workers (e.g., via OS-level clustering or a process manager) to serve parallel requests without blocking; the exact concurrency model is an implementation concern resolved during planning.
- The `source` field is always `"admin"` for this endpoint in v1; a separate `POST /api/v1/appointments/public` endpoint (for unauthenticated customer submissions) is out of scope for this specification.
- The service will be deployed as a Docker container as per the System Constitution monorepo layout; environment variables supply all configuration (Redis URL, partition count, TTL).
- Downstream consumer compatibility — the stream message schema described in `packages/shared-types` — is fixed for v1 and must not be changed by this service unilaterally.
