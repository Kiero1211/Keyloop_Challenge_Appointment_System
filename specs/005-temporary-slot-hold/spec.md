# Feature Specification: Temporary Slot Hold

**Feature Branch**: `[005-temporary-slot-hold]`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "Implement feature to hold slot for technician and service bay only for 5 minutes (For the backend only, we don’t build UIs here)
1. User choose to create an appointment ⇒ Create a temporary cache for the appointment
    1. Now, other users in the same tenant cannot book the same technicians and service bays, because they are ‘temporarily-occupied’.
2. If they fail to confirm the booking after 5 minutes (Confirm means the UI will call POST**`api/v1/appointments`**) ⇒ The temporary cache of the appoint will be cancelled and the user have to initiate a new booking session again."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initiate Booking Hold (Priority: P1)

As a user initiating a booking, I want the system to temporarily hold the technician and service bay so that no one else can book them while I complete my checkout/confirmation process.

**Why this priority**: Without a temporary hold, multiple users could attempt to book the same slot simultaneously, resulting in double bookings or frustrating rejections at the final confirmation step.

**Independent Test**: Can be fully tested by initiating a hold and then attempting a secondary hold or booking for the exact same technician, bay, and time slot from a different session. The secondary attempt must be rejected.

**Acceptance Scenarios**:

1. **Given** an available technician and service bay, **When** a user initiates a booking hold, **Then** the system creates a 5-minute temporary hold and reserves the slot.
2. **Given** an active temporary hold on a slot, **When** another user attempts to hold or book the same slot, **Then** the system rejects the request indicating the slot is occupied.

---

### User Story 2 - Confirm Booking (Priority: P1)

As a user with an active hold, I want to confirm my booking so that the temporary hold is converted into a permanent scheduled appointment.

**Why this priority**: The hold must be capable of transitioning into actual business value (a confirmed appointment).

**Independent Test**: Can be fully tested by creating a hold and sending the confirmation request within 5 minutes.

**Acceptance Scenarios**:

1. **Given** an active 5-minute hold, **When** the user sends a confirmation request, **Then** the system successfully books the appointment and clears the temporary hold.

---

### User Story 3 - Hold Expiration (Priority: P2)

As the system, I want temporary holds to automatically expire after 5 minutes if unconfirmed, so that the resources become available for other customers again.

**Why this priority**: Failsafe mechanism to prevent resource lockup if a user abandons their session.

**Independent Test**: Can be fully tested by creating a hold, waiting 5 minutes, and then verifying the slot is available for new bookings.

**Acceptance Scenarios**:

1. **Given** an active hold that was created 5 minutes ago, **When** no confirmation is received, **Then** the system automatically drops the hold.
2. **Given** an expired hold, **When** the original user attempts to confirm it, **Then** the system rejects the confirmation request requiring a new session.

### Edge Cases

- What happens if the confirmation request arrives exactly at the 5-minute mark (network delay)?
- How does the system handle clock drift between different microservices checking the expiration?
- What happens if the service crashes while a hold is active? (It should still expire organically based on time).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an endpoint or mechanism to initiate a temporary booking hold for a specified technician and service bay.
- **FR-002**: System MUST block any new holds or bookings that overlap in time with an existing active temporary hold for the same technician or service bay within the same tenant.
- **FR-003**: System MUST automatically expire the temporary hold exactly 5 minutes after creation.
- **FR-004**: System MUST allow the user to confirm the booking (via `POST api/v1/appointments`) while the hold is active, converting it to a scheduled appointment.
- **FR-005**: System MUST reject `POST api/v1/appointments` requests if the associated temporary hold has expired or doesn't exist.
- **FR-006**: System MUST allow multiple appointments to be booked for the same vehicle by removing the previous idempotency behavior in the API service.

### Key Entities

- **TemporaryHold**: Represents a time-bound reservation of a `Technician` and `ServiceBay`. Key attributes: Technician ID, Service Bay ID, Start Time, End Time, Expiration Timestamp (Now + 5 minutes), Tenant ID.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of overlapping requests for held slots are rejected by the system.
- **SC-002**: 100% of unconfirmed holds are released and available for new bookings exactly 5 minutes after initiation.
- **SC-003**: Confirmation of an appointment within the 5-minute window succeeds and clears the cache without concurrency errors.

## Assumptions

- Users have a mechanism to identify their hold (e.g., a hold token or session ID) when calling the confirmation endpoint.
- Timezone handling is standardized across the system in UTC.
- The 5-minute duration is fixed for now and does not need to be configurable per tenant.
