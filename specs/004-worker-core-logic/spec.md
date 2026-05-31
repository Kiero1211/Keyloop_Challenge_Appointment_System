# Feature Specification: Worker Availability Engine & Tenant Bulkheading

**Feature Branch**: `004-worker-core-logic`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "worker-core-logic — Implement the core scheduling validation logic and infrastructure resilience inside the appointment-worker-service."

---

## Summary

This feature delivers two production-critical capabilities inside the `appointment-worker-service` (C# .NET 8 Worker):

1. **Availability Engine** — Before confirming an appointment booking, the Application Layer (`AppointmentProcessor`) must verify that the requested technician and service bay are genuinely free during the requested timeslot. Today the worker delegates availability checking to `IBayAvailabilityService`, but the implementation is a stub. This feature replaces that stub with a real domain-invariant enforcement: a resource is occupied if any *active* appointment (`Scheduled` or `InProgress`) for the same tenant overlaps the requested window. Cancelled or Completed appointments must never block a booking.

2. **Tenant Bulkhead** — A "whale" dealership flooding the Redis stream with thousands of simultaneous bookings must not starve smaller tenants. The consumer loop must partition concurrent execution by `tenant_id`, capping the maximum concurrency per tenant so that other tenants' messages are always picked up without waiting for the whale's queue to drain.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Booking is Rejected When Resource Is Actively Occupied (Priority: P1)

A service advisor at Tenant A tries to book Technician T for bay B at 10:00–11:00. Another appointment for the same technician and bay at that tenant is already `InProgress` (10:00–11:00). The booking must be rejected with a clear `RESOURCE_CURRENTLY_OCCUPIED` signal.

**Why this priority**: This is the core correctness invariant. Without it, double-bookings corrupt operational data across all tenants.

**Independent Test**: The use case can be fully tested by injecting a mock repository that returns one conflicting `InProgress` record, then asserting the processor throws `ResourceCurrentlyOccupiedException`.

**Acceptance Scenarios**:

1. **Given** an existing appointment with status `InProgress` overlapping the requested timeslot for the same tenant/technician/bay, **When** `AppointmentProcessor.ProcessAsync` is called, **Then** a `ResourceCurrentlyOccupiedException` (domain code `RESOURCE_CURRENTLY_OCCUPIED`) is thrown and no `TrackingRecord` is persisted.

2. **Given** an existing appointment with status `Scheduled` overlapping the requested timeslot for the same tenant/technician/bay, **When** `AppointmentProcessor.ProcessAsync` is called, **Then** a `ResourceCurrentlyOccupiedException` is thrown.

3. **Given** an existing appointment with status `Cancelled` overlapping the requested timeslot, **When** `AppointmentProcessor.ProcessAsync` is called, **Then** the booking proceeds normally and a `Confirmed` `TrackingRecord` is persisted.

4. **Given** an existing appointment with status `Completed` overlapping the requested timeslot, **When** `AppointmentProcessor.ProcessAsync` is called, **Then** the booking proceeds normally and a `Confirmed` `TrackingRecord` is persisted.

5. **Given** an existing appointment with status `InProgress` for a **different tenant** (same technician/bay IDs), **When** `AppointmentProcessor.ProcessAsync` is called for Tenant B, **Then** the booking proceeds normally (strict tenant isolation).

---

### User Story 2 — Whale Tenant Cannot Starve Smaller Tenants (Priority: P2)

When 50 messages from `tenant_A` and 1 message from `tenant_B` arrive simultaneously in the Redis stream, `tenant_B`'s message must begin processing immediately without waiting for all 50 `tenant_A` messages to complete.

**Why this priority**: Without this guarantee, a single high-volume dealership can render the system unresponsive for all others — a SLA-breaking noisy-neighbour scenario.

**Independent Test**: A concurrency test fires 50 tasks for `tenant_A` (each artificially delayed 200 ms) and 1 task for `tenant_B` simultaneously. The test asserts that `tenant_B`'s task completes within a strict deadline (e.g., 500 ms) while `tenant_A` tasks are still pending.

**Acceptance Scenarios**:

1. **Given** 50 simultaneous booking messages for `tenant_A` and 1 for `tenant_B`, **When** the bulkhead allows at most 5 concurrent executions per tenant, **Then** `tenant_B`'s message is completed in under 500 ms regardless of `tenant_A`'s queue depth.

2. **Given** a tenant whose bulkhead queue is full (> configured max), **When** a new message arrives for that tenant, **Then** the message is locally queued without blocking the main Redis consumer loop from reading and dispatching other tenants' messages.

3. **Given** the bulkhead rejects a message due to a full queue, **When** overflow handling runs, **Then** the message is NOT lost — it is returned to the Redis stream pending queue without acknowledgement.

---

### User Story 3 — Correct Timeslot Overlap Detection (Priority: P2)

The availability check must use physical range overlap semantics, not just start-time equality, so that adjacent or partially overlapping bookings are correctly identified.

**Why this priority**: Start-time-only comparison would allow two bookings at 10:00 and 10:30 for the same resource to both succeed even if the first runs until 11:00.

**Independent Test**: Unit tests covering adjacent (non-overlapping), identical, partially overlapping, and fully contained timeslot pairs, asserting correct `available`/`occupied` outcomes.

**Acceptance Scenarios**:

1. **Given** existing appointment `[10:00, 11:00)` and request `[11:00, 12:00)`, **When** availability is checked, **Then** the resource is considered available (adjacent slots do not conflict).

2. **Given** existing appointment `[10:00, 12:00)` and request `[10:30, 11:30)`, **When** availability is checked, **Then** the resource is considered occupied (contained overlap).

3. **Given** existing appointment `[10:00, 11:00)` and request `[10:00, 11:00)`, **When** availability is checked, **Then** the resource is considered occupied (exact match).

---

### Edge Cases

- What happens when `TechnicianId` or `ServiceBayId` are null? Auto-assignment is out of scope. For now, the system MUST reject events that do not explicitly provide both `TechnicianId` and `ServiceBayId`.
- What happens if the booking request lacks other required fields or violates capability rules? The system MUST require fields like `tenant_id` and `ServiceTypeId`, and validate that the technician is able to perform the `ServiceTypeId`.
- Timezone handling: How are times stored? The appointment time column in the DB must strictly be UTC+0.
- What happens if the database is unreachable during the availability check? The exception must propagate and the message must NOT be acknowledged (no silent data loss).
- What happens if a technician is free but the bay is occupied (or vice versa)? The booking must be rejected — both dimensions must be free simultaneously.
- What happens if multiple worker instances race to book the same slot? Optimistic concurrency on `TrackingRecord.Version` (xmin) must reject the second writer without data corruption.
- What happens if the bulkhead overflows and the local queue also exceeds capacity? The message must be NACK'd back to the stream (not acknowledged) so it will be redelivered.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST check, for every incoming booking request, whether the requested technician is free during the requested timeslot within the same tenant's appointment history.
- **FR-002**: The system MUST check, for every incoming booking request, whether the requested service bay is free during the requested timeslot within the same tenant's appointment history.
- **FR-003**: The system MUST consider an existing appointment a conflict **only** if its status is `Scheduled` or `InProgress`. Appointments with status `Cancelled` or `Completed` MUST NOT block new bookings.
- **FR-004**: The system MUST throw a `ResourceCurrentlyOccupiedException` with domain error code `RESOURCE_CURRENTLY_OCCUPIED` when a conflict is detected, aborting the booking transaction.
- **FR-005**: The system MUST enforce strict tenant isolation: conflict checks MUST only inspect appointments belonging to the exact same `tenant_id` as the incoming request.
- **FR-006**: The system MUST limit the maximum number of concurrently executing booking handlers for any single `tenant_id` per worker instance to a configurable cap (default: 5).
- **FR-007**: The system MUST NOT block the main Redis stream consumer loop while per-tenant concurrency is saturated. Other tenants' messages MUST continue to be dequeued and dispatched immediately.
- **FR-008**: Overflow messages for a saturated tenant MUST be held locally or re-queued without acknowledgement — they MUST NOT be silently dropped.
- **FR-009**: The overlap detection algorithm MUST use physical range overlap: two ranges `[A, B)` and `[C, D)` conflict if and only if `A < D AND C < B` (half-open interval semantics).
- **FR-010**: Both the availability check and the bulkhead enforcement MUST be independently testable via unit and integration tests with mocked or in-process dependencies.
- **FR-011**: The system MUST reject incoming booking requests if `TechnicianId` or `ServiceBayId` is missing (auto-assignment is out of scope). It MUST also ensure other required fields like `tenant_id` and `ServiceTypeId` are provided, and that the technician is capable of performing the requested `ServiceTypeId`.
- **FR-012**: The appointment time columns (`StartTime`, `EndTime`) in the database MUST strictly be UTC+0.

### Key Entities

- **AppointmentMessage**: The inbound booking request carrying `TenantId`, `TechnicianId`, `ServiceBayId`, `DesiredStartTime` (and implicitly an end time derived from service type duration or a default of 1 hour).
- **TrackingRecord**: The persisted appointment record with `Status` (`Pending`, `Confirmed`, `Rejected`), `StartTime`, `EndTime`, `TenantId`, `TechnicianId`, `ServiceBayId`, and an optimistic-concurrency `Version` token.
- **AppointmentStatus** (extended): Must include `Scheduled` and `InProgress` as blocking statuses, and `Cancelled` and `Completed` as non-blocking statuses (in addition to the existing `Pending`, `Confirmed`, `Rejected` workflow statuses).
- **TenantBulkhead**: A per-tenant concurrency gate (not a persistent entity — an in-memory policy keyed by `tenant_id`).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero double-bookings occur when two requests for the same tenant, technician, and overlapping timeslot are processed concurrently — verified by a concurrency integration test with 100 racing requests.
- **SC-002**: A booking request that conflicts with a `Cancelled` appointment is accepted 100% of the time — verified by a unit test suite with zero false rejections.
- **SC-003**: When 50 messages for one tenant and 1 message for another tenant arrive simultaneously, the smaller tenant's message completes processing within 500 ms — verified by the noisy-neighbour concurrency test.
- **SC-004**: No messages are lost under bulkhead overflow conditions — verified by asserting that unacknowledged messages are redeliverable from the stream after a simulated overflow.
- **SC-005**: The availability check query executes in under 50 ms at p95 for a tenant with up to 10,000 active appointments — verified by a load test against a seeded PostgreSQL database.

---

## Assumptions

- The appointment end time is calculated as `DesiredStartTime + 1 hour` for MVP purposes (matching the existing implementation); a future feature will derive it from the service type duration.
- The domain status vocabulary will be extended to include `Scheduled` and `InProgress` alongside the existing `Pending`, `Confirmed`, `Rejected` — these align with the business lifecycle of an appointment after it has been confirmed.
- A concurrency-limiting policy (bulkhead) will be applied per tenant; the specific mechanism is an implementation detail left to the planning phase.
- The per-tenant concurrency cap defaults to 5 and is expected to be environment-configurable without requiring a code change.
- The overlap query against the persistent store will rely on the existing global tenant-scoping mechanism so that no additional tenant filter needs to be explicitly coded in application logic.
- Existing optimistic concurrency on persisted records remains in place to guard against concurrent writer races — this feature does not modify that mechanism.
- Tests will follow the same containerised integration-test pattern already established in the repository.
