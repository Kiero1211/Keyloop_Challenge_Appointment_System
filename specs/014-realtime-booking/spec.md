# Feature Specification: Real-Time Appointment Booking

**Feature Branch**: `014-realtime-booking`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "real-time booking - I want the create appointment flow to achieve real-time. API service and Worker service should use the same hash cache for the appointments. When the API puts the appointment record to stream, update the appointment hash with status 'Pending'. When the worker processes the message, it should update status and notes back to the same hash. The UI will constantly call get 'Pending' and 'Scheduled' appointments on cache. In the create appointment modal, the get technician and get bay service should only display the ones that are not held by other customers. Also check for the availability of both a ServiceBay and a qualified Technician for the entire service duration."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Appointment with Live Status Feedback (Priority: P1)

A service desk operator opens the "Create Appointment" modal for a customer. As they select a service type, the system immediately filters the available technicians to only those qualified for that service type **and** free for the entire service duration. Similarly, only unoccupied service bays appear. Once the operator submits the form, the appointment card appears instantly in the list with a "Pending" status badge, and updates automatically to "Scheduled" (or "Failed") within seconds — without any page refresh.

**Why this priority**: This is the core value proposition of the feature. Real-time feedback prevents double-bookings, eliminates the need to manually refresh, and dramatically reduces scheduling errors.

**Independent Test**: Open the create appointment modal, verify that technicians and bays already in use for the chosen time slot are absent from the dropdown lists, submit the form, and confirm the appointment row appears immediately with "Pending" then transitions to "Scheduled".

**Acceptance Scenarios**:

1. **Given** an operator opens the create appointment modal and selects a service type with a 60-minute duration, **When** the technician dropdown is rendered, **Then** only technicians who (a) have the required skill and (b) have no overlapping appointment for the full 60-minute window are shown.
2. **Given** an operator opens the create appointment modal and selects a start time, **When** the service bay dropdown is rendered, **Then** only service bays not already occupied for the entire service duration are shown.
3. **Given** an operator submits the create appointment form, **When** the request is accepted, **Then** the new appointment appears in the active appointments list with status "Pending" within 1 second.
4. **Given** an appointment is in "Pending" status, **When** the worker service processes it successfully, **Then** the appointment status in the UI updates to "Scheduled" without a full page reload, within 5 seconds.
5. **Given** the worker service fails to process an appointment, **When** processing is complete, **Then** the appointment status in the UI updates to "Failed" with a visible error note.

---

### User Story 2 - Live Technician and Bay Availability During Booking (Priority: P2)

While an operator is in the middle of filling out the create appointment form, another operator in a different browser session books the same technician or bay for the same time slot. When the first operator's modal re-evaluates availability (e.g., on field change), the now-occupied resource no longer appears.

**Why this priority**: Concurrent booking conflicts are the most common source of double-booking. Real-time availability filtering prevents this without requiring pessimistic locking of the entire form.

**Independent Test**: Open two browser sessions simultaneously. In session A, begin filling a form for a given time slot. In session B, complete a booking for a technician that session A was about to select. Switch back to session A, change any field to trigger re-evaluation, and confirm the booked technician no longer appears.

**Acceptance Scenarios**:

1. **Given** Technician A is available and Operator 1 has opened the create appointment modal, **When** Operator 2 successfully books Technician A for an overlapping time slot, **Then** if Operator 1 triggers a re-evaluation of the technician list (e.g., changes the service type or start time), Technician A is no longer shown.
2. **Given** a service bay becomes occupied mid-form, **When** the operator changes the date/time field, **Then** the now-occupied bay disappears from the bay selection list.

---

### User Story 4 - View Occupied Time Frames for a Selected Technician or Bay (Priority: P2)

When an operator selects a specific technician or service bay from the dropdown in the create appointment modal, the UI immediately shows a visual timeline (or list) of that resource's already-occupied time windows for the relevant day. The operator can see at a glance which slots are taken and choose a time that does not conflict.

**Why this priority**: Filtering dropdowns tells the operator *who* is available, but showing occupied time frames tells them *when* a resource is busy so they can pick the right slot — reducing trial-and-error and back-and-forth.

**Independent Test**: Select any technician from the dropdown. Verify that the occupied time frames displayed match the technician's currently scheduled appointments (derived from the occupancy cache). Then complete an appointment that uses that technician and confirm the new time range immediately appears in the occupied list.

**Acceptance Scenarios**:

1. **Given** an operator selects a technician in the create appointment modal, **When** the UI renders the selection detail panel, **Then** it displays the technician's occupied time windows (appointment `id`, `start_time`, `end_time`) sourced from the occupancy cache.
2. **Given** an operator selects a service bay in the create appointment modal, **When** the UI renders the selection detail panel, **Then** it displays the bay's occupied time windows (appointment `id`, `start_time`, `end_time`) sourced from the occupancy cache.
3. **Given** the worker transitions an appointment to "Scheduled", **When** the UI next polls the occupancy endpoint, **Then** that appointment's time window appears in the occupied list for both its technician and its service bay.
4. **Given** an appointment is marked "Completed", **When** the worker updates the occupancy cache, **Then** that appointment's time window is removed from the occupied list for both the technician and the service bay.
5. **Given** the operator is actively viewing occupied times for a resource, **When** another operator books that same resource, **Then** the new time window appears in the list within the polling interval without a full page reload.

---

### User Story 3 - View Active (Pending and Scheduled) Appointments in Near Real-Time (Priority: P3)

A manager opens the appointments dashboard and sees the current list of "Pending" and "Scheduled" appointments. The list refreshes automatically at a regular interval, so newly created or recently changed appointments appear without manual refresh.

**Why this priority**: The live dashboard supports oversight of in-flight work. It is less critical than the booking flow itself but provides significant operational value.

**Independent Test**: Open the appointments dashboard in one tab and create a new appointment in another tab. Verify the dashboard tab shows the new appointment within the polling interval (e.g., within 5 seconds), transitioning from Pending to Scheduled.

**Acceptance Scenarios**:

1. **Given** the appointments dashboard is open, **When** a new appointment is created by any operator, **Then** it appears in the dashboard within 5 seconds without manual refresh.
2. **Given** an appointment transitions from "Pending" to "Scheduled", **When** the dashboard polls the server, **Then** the status badge on the appointment row updates accordingly.
3. **Given** an appointment has a "Failed" status, **When** the dashboard next refreshes, **Then** the failed appointment is visible only for 1 hour after failure (as it has a 1-hour TTL in the cache), after which it disappears from the active view.

---

### Edge Cases

- What happens when the worker service is unavailable and an appointment stays "Pending" indefinitely? (System should surface stale Pending items to support staff.)
- What happens when both a technician and a bay are available but the technician lacks the skill for the selected service type? => The technician should not be displayed in the dropdown.
- What happens when the cache is empty or evicted (e.g., Redis restart) — should the system fall back to the database to populate pending/scheduled lists?
- What happens when the same technician or bay is requested simultaneously by two operators submitting at the exact same time (race condition)?
- What if an appointment transitions to "Failed" — does the operator need to manually retry, or is there an automatic retry mechanism?
- What happens if the occupancy cache for a resource is out of sync with the database (e.g., a worker crash between writing the appointment hash and writing the occupancy entry)? The system must re-seed occupancy from the database on cold start.
- What happens when an appointment is deleted or cancelled — should its time window be removed from the occupancy cache immediately?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST maintain a shared appointment cache keyed by `tenant:<tenant_id>:appointment:<appointment_id>` that mirrors the appointment table schema (all fields including `id`, `tenant_id`, `customer_id`, `vehicle_id`, `service_type_id`, `technician_id`, `service_bay_id`, `start_time`, `end_time`, `status`, `notes`, `actual_start_time`, `actual_end_time`, `created_at`, `updated_at`).
- **FR-002**: When the API service accepts a new appointment creation request and publishes it to the message stream, it MUST simultaneously write an appointment hash to the cache with `status = "Pending"`.
- **FR-003**: When the worker service completes processing an appointment message, it MUST update the cached appointment hash with the final `status` (`"Scheduled"` or `"Failed"`) and any relevant `notes`.
- **FR-004**: When a processed appointment has `status = "Failed"`, the cache entry MUST be given a Time-To-Live (TTL) of 1 hour, after which it is automatically removed.
- **FR-005**: The API service MUST expose endpoints that allow the UI to query currently "Pending" and "Scheduled" appointments from the cache, scoped per tenant.
- **FR-006**: The create appointment modal MUST display only technicians who (a) possess the skill for the selected service type and (b) have no existing appointment that overlaps the requested time slot for the full service duration.
- **FR-007**: The create appointment modal MUST display only service bays that have no existing appointment overlapping the requested time slot for the full service duration.
- **FR-008**: The API service MUST expose public endpoints (authenticated per tenant) to retrieve occupied time slots for a given technician and for a given service bay, sourced from the occupancy cache.
- **FR-009**: The UI appointment dashboard MUST continuously poll the cache-backed endpoints for "Pending" and "Scheduled" appointments and reflect updates without requiring a full page reload.
- **FR-010**: Availability checks for technicians and service bays MUST consider the complete service duration (start time + service type estimated duration) rather than only the start time.
- **FR-011**: The cache appointment hash schema MUST be consistent between the API service and the worker service, with no field mismatches.
- **FR-012**: The system MUST maintain a dedicated occupancy data structure in the cache, separate from the appointment hash, that tracks all committed time windows per resource. The key format for technicians MUST be `tenant:<tenant_id>:technician:<technician_id>:occupied` and for service bays MUST be `tenant:<tenant_id>:bay:<service_bay_id>:occupied`. Each entry in the structure MUST store at minimum the `appointment_id`, `start_time`, and `end_time` of the occupying appointment.
- **FR-013**: When the worker service transitions an appointment to "Scheduled", it MUST add the appointment's time window (`appointment_id`, `start_time`, `end_time`) to the occupancy structure for both the assigned technician and the assigned service bay.
- **FR-014**: When the worker service transitions an appointment to "Completed", it MUST remove the appointment's time window from the occupancy structure for both the previously assigned technician and the previously assigned service bay.
- **FR-015**: When an operator selects a technician in the create appointment modal, the UI MUST display the technician's currently occupied time windows retrieved from the occupancy cache endpoint.
- **FR-016**: When an operator selects a service bay in the create appointment modal, the UI MUST display the bay's currently occupied time windows retrieved from the occupancy cache endpoint.
- **FR-017**: The UI MUST continuously poll the occupancy endpoint for the currently selected technician and service bay while the create appointment modal is open, so that newly booked time windows appear within the polling interval.

### Key Entities

- **Appointment Cache Hash**: A per-appointment key-value structure in the shared cache storing all appointment fields plus `status` and `notes`. Key format: `tenant:<tenant_id>:appointment:<appointment_id>`.
- **Resource Occupancy Structure**: A dedicated, per-resource data structure in the cache that lists all time windows committed to that resource by active (Scheduled) appointments. Key format: `tenant:<tenant_id>:technician:<technician_id>:occupied` and `tenant:<tenant_id>:bay:<service_bay_id>:occupied`. Each entry contains `appointment_id`, `start_time`, and `end_time`. This structure is written to by the worker when an appointment becomes Scheduled and entries are removed when an appointment becomes Completed.
- **Technician Availability**: A derived view of a technician's free time, computed by the API from the absence of entries in the technician's occupancy structure for a requested time window.
- **Service Bay Availability**: A derived view of a bay's free time, computed from the absence of entries in the bay's occupancy structure for a requested time window.
- **Occupied Time Slot**: A time range `[start_time, end_time)` attributed to a resource (technician or bay), sourced from the resource occupancy structure in the cache.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After submitting the create appointment form, the new appointment appears in the active list with "Pending" status within 1 second.
- **SC-002**: After the worker processes an appointment, the status in the UI updates to "Scheduled" or "Failed" within 5 seconds of processing completion.
- **SC-003**: Technician and service bay dropdown lists in the create appointment modal reflect real-time occupancy, with zero double-bookings attributable to stale availability data.
- **SC-004**: The appointments dashboard auto-refreshes active appointments within 5 seconds of any status change.
- **SC-005**: Failed appointments are automatically removed from the active cache view within 1 hour of failure, without manual intervention.
- **SC-006**: Availability check endpoints respond within 500 milliseconds for 95% of requests under normal load.
- **SC-007**: When a technician or service bay is selected in the create appointment modal, their occupied time windows are displayed within 1 second and update automatically within the polling interval when new bookings are made.

---

## Assumptions

- The shared cache (Redis) is already provisioned and accessible to both the API service and the worker service within the existing Docker Compose infrastructure.
- The message stream (Redis Streams or equivalent) is already in use for appointment processing between the API and worker services.
- "Occupied" for the purpose of availability filtering and the occupancy structure means any appointment in status `Scheduled` — `Pending` does not yet have a confirmed slot, and `Failed`/`Cancelled`/`Completed` do not hold a slot.
- The UI polling interval for the appointments dashboard and occupancy display will be 3–5 seconds (implementation default; not user-configurable in this iteration).
- Mobile support for the create appointment modal is out of scope for this feature.
- Automatic retry for failed appointments is out of scope; a failed appointment must be re-created manually.
- The cache is the primary source for the "active appointments" dashboard and the occupancy display; the database is the source of truth for historical queries.
- If the cache is cold (empty after restart), the system will re-seed both the appointment hash cache and the resource occupancy structures from the database for Scheduled appointments on first access.
- Cancellation of appointments and its effect on the occupancy structure is treated as equivalent to Completion: the time window is removed from the occupancy cache.
