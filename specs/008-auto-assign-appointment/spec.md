# Feature Specification: Auto Assign Appointment

**Feature Branch**: `[###-feature-name]`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "auto assign feature - 
When the user creates an appointment, introduce a new flag called \"autoAssigned\": boolean
If the flag is false, then technicianId and serviceBayId, technicianHolId, serviceBayHoldId are required.
If not, then the above field are not required in the request body.
=> The system will find the available bay and technician with matching skills witht serviceTypeId  (This logic should be in the worker service). If the system can find a suiting pair, then create the appointment like normal. If not then add to the dlq"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create appointment with auto-assign (Priority: P1)

As a user, I want to create an appointment without specifying the exact technician and service bay, so that the system can automatically assign the most suitable available technician and bay based on the service type skills required.

**Why this priority**: Core functionality of the auto-assign feature, making scheduling easier for users without manual resource allocation.

**Independent Test**: Can be fully tested by submitting an appointment creation request with `autoAssigned: true` and verifying that the system assigns an appropriate technician and bay, or queues it if none are available.

**Acceptance Scenarios**:

1. **Given** an appointment request with `autoAssigned: true` and a `serviceTypeId`, **When** there is an available technician with matching skills and an available service bay, **Then** the system automatically assigns them and creates the appointment successfully.
2. **Given** an appointment request with `autoAssigned: true`, **When** the required fields (`technicianId`, `serviceBayId`, etc.) are omitted, **Then** the system accepts the request without validation errors.

---

### User Story 2 - Handle unavailable resources during auto-assign (Priority: P1)

As a user/system administrator, I want appointments that cannot be auto-assigned due to lack of available resources to be placed in a Dead Letter Queue (DLQ), so that they are not lost and can be reviewed or processed later.

**Why this priority**: Prevents silent failures and lost appointments when the shop is busy or lacks specific skills at the requested time.

**Independent Test**: Can be fully tested by simulating a lack of available technicians or bays and verifying the appointment request is routed to the DLQ instead of failing completely.

**Acceptance Scenarios**:

1. **Given** an appointment request with `autoAssigned: true`, **When** no technician with matching skills is available, **Then** the appointment is not created normally and is instead added to the DLQ.
2. **Given** an appointment request with `autoAssigned: true`, **When** no service bay is available, **Then** the appointment is not created normally and is instead added to the DLQ.

---

### User Story 3 - Create appointment manually (without auto-assign) (Priority: P2)

As a user, I want to manually specify the technician and service bay for an appointment by setting the auto-assign flag to false, so that I have full control over resource allocation when needed.

**Why this priority**: Preserves existing functionality and allows overrides for special cases where auto-assignment is not desired.

**Independent Test**: Can be fully tested by submitting a request with `autoAssigned: false` and ensuring the system enforces the presence of manual allocation fields.

**Acceptance Scenarios**:

1. **Given** an appointment request with `autoAssigned: false`, **When** `technicianId`, `serviceBayId`, `technicianHolId`, and `serviceBayHoldId` are provided, **Then** the system accepts the request and creates the appointment with the specified resources.
2. **Given** an appointment request with `autoAssigned: false`, **When** any of the required resource fields are missing, **Then** the system rejects the request with a validation error.

### Edge Cases

- **Concurrency issue during auto-assignment**: When multiple appointments are auto-assigned concurrently and compete for the same last available technician/bay, the system MUST use a transactional locking mechanism (e.g., distributed lock or optimistic concurrency control) to ensure only one appointment successfully claims the resource. The other appointment(s) should automatically retry the search for the next available resource, or move to the DLQ if no other resource is available.
- **Unfulfillable skill requirements**: If an appointment requests a `serviceTypeId` that requires skills no technician currently possesses (ever), the system should immediately route the appointment to the Dead Letter Queue (DLQ).
- **DLQ processing constraints**: If the DLQ processing is delayed or full, this is considered **out of scope** for this specific feature and will be handled by the general DLQ operational procedures.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept a boolean flag `autoAssigned` during appointment creation.
- **FR-002**: If `autoAssigned` is `false`, the system MUST require `technicianId`, `serviceBayId`, `technicianHolId`, and `serviceBayHoldId` in the request body.
- **FR-003**: If `autoAssigned` is `true`, the system MUST NOT require `technicianId`, `serviceBayId`, `technicianHolId`, and `serviceBayHoldId` in the request body.
- **FR-004**: When `autoAssigned` is `true`, the system MUST attempt to find an available service bay and technician with skills matching the `serviceTypeId`.
- **FR-005**: The logic for finding and assigning the available resources MUST be executed asynchronously (in the worker service).
- **FR-006**: If a suitable technician and service bay are found, the system MUST create the appointment normally with those assigned resources.
- **FR-007**: If a suitable technician and service bay cannot be found, the system MUST add the appointment request to the Dead Letter Queue (DLQ).

### Key Entities

- **Appointment**: The main entity being created, now including an `autoAssigned` preference and conditionally required resource links.
- **Technician**: A resource that must be available and possess specific skills matching the service type.
- **Service Bay**: A physical resource that must be available for the duration of the appointment.
- **Service Type**: Defines the skills required for a technician to be eligible for assignment.
- **DLQ (Dead Letter Queue)**: A queue where unassignable appointments are stored for manual intervention or retry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of appointment requests with `autoAssigned: true` successfully bypass manual resource validation at the API level.
- **SC-002**: 100% of auto-assigned appointments where resources are available are correctly provisioned with a qualified technician and an open bay.
- **SC-003**: 100% of auto-assigned appointments where resources are unavailable are successfully routed to the DLQ without data loss.
- **SC-004**: Existing manual appointment creation (`autoAssigned: false`) continues to function with 0% regression in validation strictness.

## Assumptions

- The Dead Letter Queue (DLQ) infrastructure already exists or will be provided as part of the worker service architecture.
- "Matching skills" means a technician must possess all skills required by the given `serviceTypeId`.
- Time slot availability logic for technicians and bays is already implemented and can be reused for the auto-assign search.
- The worker service has access to read the skills of technicians and the requirements of service types.
