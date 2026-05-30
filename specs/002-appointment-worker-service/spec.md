# Feature Specification: appointment-worker-service

**Feature Branch**: `002-appointment-worker-service`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "Let's implement the core long-running backend consumer within apps/appointment-worker-service/ using C# and .NET 8 BackgroundService.
Requirements:
1. Create a hosted RedisStreamConsumerService utilizing StackExchange.Redis that listens to a dedicated stream partition matching its assigned worker partition instance. For every stream, generate a worker Task for it. So one background job and process 1-4 streams at a time (based on the configured settings).
2. Upon picking up a message block, it must invoke a domain service component AppointmentProcessor to handle real-time resource validation:
- It needs to execute a HTTP request to the external BayService to query if both a physical ServiceBay and a qualified Technician are completely free for the entire duration of the service type.
- Include an explicit Optimistic Concurrency Control loop or distributed lock handler to guarantee that two worker processes consuming concurrent messages do not double-book the same exact ServiceBay or Technician at the same time.
3. Upon a validated booking confirmation, it must write a persistent tracking record using Entity Framework Core (EF Core) to a PostgreSQL data target and update the tracking status inside the Redis cache matrix.
Generate the clean, organized .NET 8 project structure, including the Program.cs, the background worker class, and the domain processing model."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Process New Appointment Bookings (Priority: P1)

As a service center manager,
I want the system to automatically process new appointment requests from the queue in real-time,
So that customers receive immediate confirmation and our bays/technicians are efficiently booked.

**Why this priority**: Core business value; if bookings aren't processed, the entire service pipeline halts.

**Independent Test**: Can be fully tested by submitting a booking request and verifying it gets validated, approved, and saved correctly.

**Acceptance Scenarios**:

1. **Given** a new valid appointment request is queued, **When** the system processes it, **Then** it is validated against resources, saved to the database, and marked as confirmed.
2. **Given** multiple appointment requests in different streams, **When** the system processes them, **Then** all requests are handled simultaneously without dropping messages.

---

### User Story 2 - Prevent Double Booking of Resources (Priority: P1)

As a service center manager,
I want the system to ensure that no two appointments can claim the same service bay and technician at the same time,
So that we never double-book our limited physical resources.

**Why this priority**: Double bookings lead to bad customer experiences and lost revenue.

**Independent Test**: Can be fully tested by submitting two concurrent booking requests for the exact same time, bay, and technician.

**Acceptance Scenarios**:

1. **Given** two concurrent booking requests for the exact same resource combination, **When** the system processes them simultaneously, **Then** only one is confirmed and the other is safely rejected or flagged for rescheduling.

---

### User Story 3 - Validate Resource Availability (Priority: P2)

As a service center manager,
I want the system to verify that the required service bay and a qualified technician are entirely free for the requested duration before confirming,
So that we don't accept appointments we cannot fulfill.

**Why this priority**: Ensures quality of service and realistic scheduling.

**Independent Test**: Can be fully tested by requesting an appointment during a time when either the required bay or the technician is unavailable.

**Acceptance Scenarios**:

1. **Given** an appointment request for an unavailable bay or technician, **When** the system processes it, **Then** the appointment is rejected due to resource conflict.

### Edge Cases

- What happens when the external resource service is temporarily unavailable or times out?
- How does the system handle messages that are malformed or missing required resource identifiers?
- What happens if the system crashes midway through validating a booking? Does it retry the message upon restart?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically consume new appointment requests from the configured messaging streams.
- **FR-002**: System MUST process multiple appointment streams simultaneously without dropping messages.
- **FR-003**: System MUST query an external resource service to verify the complete availability of both the requested service bay and a qualified technician for the entire duration of the appointment.
- **FR-004**: System MUST employ concurrency control to guarantee that concurrent appointment requests do not double-book the same service bay or technician.
- **FR-005**: System MUST persist confirmed appointment tracking records to the core database.
- **FR-006**: System MUST update the appointment status in the fast-access cache to provide real-time updates to other services.
- **FR-007**: System MUST handle temporary unavailability of the external resource service by routing failed requests to a Dead-letter queue (DLQ) for manual inspection or later replay.

### Key Entities

- **Appointment**: The incoming booking message containing service type, requested time, customer id, vehicle id, and source.
- **Service Bay**: A physical location where the service is performed. Must be available for the entire appointment duration.
- **Technician**: A qualified employee who performs the service. Must be available for the entire appointment duration.
- **Tracking Record**: The persisted confirmation of a validated appointment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of concurrent booking attempts for the same resource and timeslot result in only one confirmed booking (zero double-bookings).
- **SC-002**: System can process and validate at least 100 appointment requests per minute without degradation.
- **SC-003**: 99.9% of successfully validated appointments are correctly persisted and status is updated within 1 second of processing.
- **SC-004**: System successfully recovers from restarts or external service timeouts without losing any pending appointment requests.

## Assumptions

- The external service for querying bay and technician availability responds with accurate, up-to-date schedule information.
- The message stream guarantees at-least-once delivery of appointment requests.
- The database and fast-access cache are highly available.
