# Feature Specification: Tenant Appointment Fixes

**Feature Branch**: `[tenant-appointment-fixes]`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "fix these small problems:
- [ ]  Create a feature to add tenant manager ⇒ Can add users to a tenant (This can also be done by Admin)
    - [ ]  The switch tenant endpoint does not work, fix it so that a user can smoothly switch between tenants
- [ ]  There are 2 CreateAppointmentUseCase class → Only use the one with sufficient rules
- [ ]  Add foreign key constrains for tenant_id in every tables
- [ ]  End time of appointment based on the ServiceType duration
- [ ]  appointment_stream do not have tenant:tenant_id prefix
- [ ]  Technicians and Service Bay should have an endpoint to get available technician or service bay based on a time frame"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Role and Tenant Management (Priority: P1)

As an Admin or Tenant Manager, I want to manage users and their roles, so that I can properly administer the tenant's access and maintain data isolation.

**Why this priority**: Essential for tenant administration, multi-tenant security, and proper data access control.

**Independent Test**: Can be fully tested by verifying Admin can promote users, TenantManager can assign Guests to their tenant, and a single user can have different roles in different tenants.

**Acceptance Scenarios**:

1. **Given** a new user registers without providing a `tenant_id`, **When** the registration completes, **Then** the user is created with the Guest role.
2. **Given** a new user registers with a specific `tenant_id`, **When** the registration completes, **Then** they are automatically assigned the TenantUser role for that tenant.
3. **Given** I am logged in as a TenantManager, **When** I assign a Guest to my tenant, **Then** the Guest becomes a TenantUser in my tenant.
4. **Given** I am logged in as an Admin, **When** I promote a TenantUser within a tenant, **Then** they become a TenantManager for that specific tenant.
5. **Given** a user belongs to Tenant A and Tenant B, **When** they act in Tenant A they can be a TenantUser, and **Then** when they switch to Tenant B they can act as a TenantManager based on their distinct roles per tenant.

---

### User Story 2 - Smooth Tenant Switching (Priority: P1)

As a user belonging to multiple tenants, I want to be able to smoothly switch between my assigned tenants, so that I can work in the correct context without logging out and back in.

**Why this priority**: The switch tenant endpoint is currently broken, blocking users from accessing their other tenants.

**Independent Test**: Can be tested by having a user with two tenants call the switch tenant endpoint and verifying their active context changes successfully.

**Acceptance Scenarios**:

1. **Given** a user is assigned to Tenant A and Tenant B, **When** they invoke the switch tenant endpoint to switch from A to B, **Then** their session context is successfully updated to Tenant B.

---

### User Story 3 - Appointment End Time Calculation (Priority: P2)

As a customer or staff scheduling an appointment, I want the appointment end time to be automatically calculated based on the selected ServiceType duration, so that scheduling is accurate and avoids overlaps.

**Why this priority**: Crucial for correct scheduling and resource management.

**Independent Test**: Can be tested by creating an appointment with a known ServiceType duration and verifying the resulting end time equals start time + duration.

**Acceptance Scenarios**:

1. **Given** a ServiceType with a 60-minute duration, **When** an appointment is scheduled for 10:00 AM, **Then** the appointment end time is automatically set to 11:00 AM.

---

### User Story 4 - Get Available Resources (Priority: P2)

As a scheduler, I want to retrieve a list of available Technicians and Service Bays for an arbitrary time frame from now (Ranging from 1 hour up to 30 days), so that I can properly assign resources to new appointments without being restricted to a single day.

**Why this priority**: Required to accurately assign resources without conflicts and facilitate flexible scheduling across multiple days.

**Independent Test**: Can be tested by querying the endpoint with a time range spanning multiple days and verifying only resources without overlapping appointments within that extended range are returned.

**Acceptance Scenarios**:

1. **Given** a time frame spanning multiple days (e.g., Oct 10 10:00 AM to Oct 12 11:00 AM), **When** I request available technicians, **Then** the system returns only technicians who do not have overlapping appointments in that entire period.
2. **Given** a time frame spanning across a week, **When** I request available service bays, **Then** the system returns only service bays that are free during that specific time block.
3. **Given** a time frame of a few hours on a specific day in the future, **When** I request available resources, **Then** the system accurately reflects availability.

---

### User Story 5 - Multi-Day Appointment Search (Priority: P2)

As a scheduler or TenantManager, I want to search and retrieve a list of appointments over an arbitrary time frame from now (Ranging from 1 hour up to 30 days), so that I can view upcoming schedules beyond just the current day.

**Why this priority**: The current GET Appointment endpoint only allows looking up appointments on the same day, which severely limits schedule visibility and planning.

**Independent Test**: Can be tested by calling the GET Appointment endpoint with a start date and end date spanning a week and verifying appointments from all days in that range are returned.

**Acceptance Scenarios**:

1. **Given** there are appointments scheduled across Monday, Tuesday, and Wednesday, **When** I request the list of appointments for that three-day period, **Then** the system returns all appointments falling within that multi-day range.
2. **Given** I am looking for appointments in the next 7 days, **When** I query the endpoint with a 7-day time block, **Then** the system accurately fetches the schedule for the entire week.

### Edge Cases

- What happens when a user tries to switch to a tenant they don't belong to? (Should return access denied / 403)
- What happens when an appointment is scheduled outside of business hours? (Should handle based on existing validation rules)
- How does the system handle concurrent requests for the same available technician?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support four distinct user roles: Guest, TenantUser, TenantManager, and Admin.
- **FR-002**: System MUST assign the Guest role to users who register without specifying a `tenant_id`.
- **FR-003**: System MUST automatically create and assign the TenantUser role to users who register specifying a `tenant_id`.
- **FR-004**: System MUST provide an endpoint for a TenantManager to assign a Guest to their tenant, making them a TenantUser.
- **FR-005**: System MUST provide an endpoint for an Admin to promote a TenantUser to a TenantManager for a specific tenant.
- **FR-006**: System MUST support multi-tenant role assignment, allowing a single user to hold different roles (e.g., TenantUser vs TenantManager) across different tenants simultaneously, requiring DB schema adjustments if necessary.
- **FR-007**: System MUST allow an Admin to see all data and perform all actions across all tenants.
- **FR-008**: System MUST allow a TenantManager to see all data within their tenant.
- **FR-009**: System MUST restrict a TenantUser to only see their own Customer, Vehicle, and Appointment data.
- **FR-010**: System MUST fix the switch tenant endpoint to correctly update user session/context to the target tenant.
- **FR-011**: System MUST consolidate `CreateAppointmentUseCase` by retaining only the version with sufficient business rules and removing the duplicate.
- **FR-012**: System MUST enforce foreign key constraints for `tenant_id` across all relevant database tables to ensure data integrity.
- **FR-013**: System MUST automatically calculate the end time of an appointment by adding the `ServiceType` duration to the appointment start time.
- **FR-014**: System MUST prefix keys or stream names in `appointment_stream` with `tenant:{tenant_id}` to ensure proper data partitioning.
- **FR-015**: System MUST provide an endpoint to query available Technicians based on a provided time frame (start and end time).
- **FR-016**: System MUST provide an endpoint to query available Service Bays based on a provided time frame (start and end time).
- **FR-017**: System MUST update the GET Appointments endpoint to allow searching for appointments across a multi-day time frame, removing the same-day limitation.

### Key Entities

- **Tenant**: Represents an isolated business unit (dealership).
- **Role: Guest**: A user who does not belong to any tenant, created when registering without a `tenant_id`.
- **Role: TenantUser**: A normal customer within a tenant who can only see their own data (Customer, Vehicle, and Appointment), created automatically if a user registers with a `tenant_id` or when assigned by a TenantManager.
- **Role: TenantManager**: A user with administrative privileges over a specific tenant, able to see all tenant data and assign Guests to their tenant.
- **Role: Admin**: A superuser who can see and do everything across all tenants, and can promote a TenantUser to a TenantManager.
- **Appointment**: A scheduled service event requiring a time slot, technician, and service bay.
- **ServiceType**: Defines the type of service to be performed and its expected duration.
- **Technician**: An employee who performs the service.
- **ServiceBay**: The physical location where the service is performed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users with multiple tenants can switch between them successfully 100% of the time.
- **SC-002**: 100% of newly created appointments have an end time correctly calculated from the ServiceType duration.
- **SC-003**: `tenant_id` foreign key constraints exist on all database tables that belong to a tenant.
- **SC-004**: Queries for available resources return accurately within 500ms.
- **SC-005**: All events in the `appointment_stream` are correctly partitioned by `tenant_id`.

## Assumptions

- Database schema supports adding foreign keys without complex data migrations (or data is clean enough to add them).
- ServiceType entities already have a `duration` field (e.g., in minutes).
- `appointment_stream` refers to the Redis Stream or Event Store used for appointment events.
- Authentication context (e.g., JWT token) mechanism can be updated upon switching tenants.
