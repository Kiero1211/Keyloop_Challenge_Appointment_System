# Feature Specification: User Access Control

**Feature Branch**: `015-user-access-control`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Remove the separate Customer concept and replace it with User everywhere. Add tenant user listing for TenantManager and Admin roles. Restrict TenantUser visibility to their own vehicles and appointments while preserving tenant-wide technician and service bay visibility. Allow TenantManager and Admin roles to see tenant-wide records plus separate personal vehicle and appointment views. Allow Admin users to choose from all tenants after login before entering a tenant dashboard."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - TenantUser Sees Only Personal Records (Priority: P1)

A TenantUser signs in and views the tenant dashboard. They can manage or review only the vehicles and appointments that belong to their own user identity, while still being able to view all technicians and service bays available in their tenant for booking decisions.

**Why this priority**: This closes a privacy and tenant access-control gap where ordinary users can currently see other users' vehicles and appointments.

**Independent Test**: Can be fully tested by signing in as a TenantUser in a tenant with multiple users, vehicles, appointments, technicians, and service bays, then confirming the TenantUser sees only their own vehicles and appointments while still seeing all tenant technicians and service bays.

**Acceptance Scenarios**:

1. **Given** a tenant has multiple users with separate vehicles and appointments, **When** a TenantUser opens the vehicles view, **Then** only vehicles owned by that TenantUser are shown.
2. **Given** a tenant has multiple users with separate appointments, **When** a TenantUser opens the appointments view, **Then** only appointments owned by that TenantUser are shown.
3. **Given** a tenant has technicians and service bays, **When** a TenantUser opens booking or scheduling views, **Then** all technicians and service bays for that tenant are available to view.
4. **Given** a TenantUser attempts to view another user's vehicle or appointment through navigation, refresh, search, or direct record access, **When** the request is evaluated, **Then** the record is not disclosed.

---

### User Story 2 - Managers See Tenant-Wide and Personal Views (Priority: P2)

A TenantManager or Admin working inside a tenant can view all tenant vehicles and appointments for operational oversight, and can also switch to a separate personal tab that shows only their own vehicles and appointments.

**Why this priority**: Managers need tenant-wide visibility to run operations, but their personal records should be easy to distinguish from the records they can see because of their elevated role.

**Independent Test**: Can be fully tested by signing in as a TenantManager or Admin in a tenant with several users, then confirming tenant-wide tabs show all tenant vehicles and appointments while personal tabs show only the signed-in user's vehicles and appointments.

**Acceptance Scenarios**:

1. **Given** a TenantManager is viewing a tenant dashboard, **When** they open the tenant-wide vehicles or appointments view, **Then** all vehicles and appointments belonging to users in that tenant are shown.
2. **Given** a TenantManager or Admin has their own vehicles or appointments, **When** they open the personal vehicles or personal appointments tab, **Then** only records owned by that signed-in user are shown.
3. **Given** a TenantManager or Admin is viewing technician and service bay views, **When** the tenant dashboard loads, **Then** all technicians and service bays belonging to the selected tenant are shown.
4. **Given** a TenantManager or Admin is viewing tenant-wide and personal tabs, **When** they move between tabs, **Then** the selected scope is clear and the records do not mix.

---

### User Story 3 - Managers and Admins View Tenant Users (Priority: P3)

A TenantManager or Admin can open a Users tab in the tenant dashboard to see all users belonging to the active tenant.

**Why this priority**: Tenant leaders need a simple way to review the people associated with their tenant after Customer records are removed.

**Independent Test**: Can be fully tested by signing in as a TenantManager or Admin, opening the Users tab, and confirming it lists all users in the tenant while the tab is not available to TenantUser accounts.

**Acceptance Scenarios**:

1. **Given** a TenantManager or Admin is inside a tenant dashboard, **When** they open the Users tab, **Then** all users belonging to that tenant are listed.
2. **Given** a TenantUser is inside a tenant dashboard, **When** they view available navigation and tabs, **Then** the Users tab is not available.
3. **Given** a TenantManager or Admin searches or filters the Users tab, **When** matching tenant users exist, **Then** only users from the active tenant are returned.

---

### User Story 4 - Admin Chooses Tenant Before Dashboard (Priority: P4)

An Admin signs in and first sees a list of all tenants in the system. After selecting a tenant, the Admin enters that tenant's dashboard with the same tenant-scoped views available to elevated roles.

**Why this priority**: Admins operate across tenants and need an explicit tenant context before accessing tenant dashboards.

**Independent Test**: Can be fully tested by signing in as an Admin, confirming all tenants are listed, selecting one tenant, and verifying all dashboard views are scoped to the selected tenant.

**Acceptance Scenarios**:

1. **Given** an Admin signs in successfully, **When** the first post-login screen appears, **Then** the Admin sees all tenants available in the system before a tenant dashboard is shown.
2. **Given** an Admin selects a tenant, **When** the tenant dashboard opens, **Then** all users, technicians, service bays, vehicles, and appointments shown belong to the selected tenant.
3. **Given** an Admin changes the selected tenant, **When** the new tenant dashboard opens, **Then** records from the previously selected tenant are no longer shown.

---

### User Story 5 - Customer Concept Is Replaced By User (Priority: P5)

All booking, vehicle, appointment, and tenant-user flows use User as the owner identity. Existing records that previously depended on Customer identity remain associated with the correct User, and no separate Customer identity is required for current workflows.

**Why this priority**: A single owner identity reduces confusion, prevents duplicate person records, and makes role-based access rules enforceable consistently.

**Independent Test**: Can be fully tested by reviewing representative user, vehicle, appointment, and tenant dashboard flows and confirming they create, display, search, and filter by User rather than Customer while preserving existing ownership.

**Acceptance Scenarios**:

1. **Given** an existing vehicle or appointment was previously associated with a customer identity, **When** the feature is complete, **Then** that record is associated with the corresponding user identity.
2. **Given** a user creates or views vehicles and appointments, **When** ownership information is displayed, **Then** the owner is represented as a User.
3. **Given** a workflow creates a vehicle or appointment, **When** owner selection or assignment is required, **Then** the workflow uses a User and does not require a separate Customer.
4. **Given** the signed-in user is a TenantUser, **When** they create an appointment, **Then** the appointment creation modal automatically assigns the appointment to that current User.
5. **Given** the signed-in user is a TenantManager or Admin, **When** they create an appointment, **Then** the appointment creation modal lets them choose which User the appointment belongs to.

### Edge Cases

- A user with no vehicles or appointments sees an empty personal state without being shown another user's records.
- A tenant with no technicians or service bays shows an empty tenant resource state without affecting vehicle or appointment visibility.
- A TenantManager or Admin who has no personal vehicles or appointments still sees tenant-wide records and an empty personal tab.
- A user belonging to multiple tenants only sees records for the active tenant context.
- An Admin who has not selected a tenant cannot access a tenant dashboard until a tenant is chosen.
- Tenant-specific searches, filters, direct record links, and refreshed pages preserve the same role and tenant visibility restrictions.
- Existing records with unresolved former customer ownership are flagged for remediation rather than assigned to the wrong user or exposed broadly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use User as the single person identity for vehicles, appointments, tenant membership, and ownership in current application workflows.
- **FR-002**: The system MUST preserve the correct owner for existing vehicles and appointments that were formerly associated with a Customer identity.
- **FR-003**: The system MUST prevent creation of new vehicles or appointments that depend on a separate Customer identity.
- **FR-004**: The system MUST update user-facing labels, lists, filters, searches, and ownership displays in affected workflows to refer to users rather than customers.
- **FR-005**: TenantUser accounts MUST see only vehicles owned by their signed-in user identity within the active tenant.
- **FR-006**: TenantUser accounts MUST see only appointments owned by their signed-in user identity within the active tenant.
- **FR-007**: TenantUser accounts MUST be able to view all technicians and service bays belonging to the active tenant.
- **FR-008**: TenantUser accounts MUST NOT be able to view another user's vehicles or appointments through navigation, search, filtering, refresh, or direct record access.
- **FR-009**: TenantManager accounts MUST be able to view all users, technicians, service bays, vehicles, and appointments belonging to the active tenant.
- **FR-010**: Admin accounts MUST be able to view all users, technicians, service bays, vehicles, and appointments belonging to the selected tenant.
- **FR-011**: TenantManager and Admin accounts MUST have separate personal tabs for their own vehicles and their own appointments within the active tenant.
- **FR-012**: TenantManager and Admin personal tabs MUST exclude records owned by other users.
- **FR-013**: The tenant dashboard MUST include a Users tab for TenantManager and Admin accounts.
- **FR-014**: The Users tab MUST list only users belonging to the active or selected tenant.
- **FR-015**: The Users tab MUST NOT be available to TenantUser accounts.
- **FR-016**: Admin accounts MUST see a tenant selection view after login before entering any tenant dashboard.
- **FR-017**: The Admin tenant selection view MUST list every tenant available in the system.
- **FR-018**: After an Admin selects a tenant, all dashboard views MUST be scoped to that selected tenant until the Admin chooses a different tenant or signs out.
- **FR-019**: The system MUST maintain tenant isolation for every listed user, technician, service bay, vehicle, and appointment regardless of role.
- **FR-020**: The system MUST show clear empty states when a permitted list has no matching records.
- **FR-021**: The system MUST deny or hide unauthorized records without revealing another user's private vehicle or appointment details.
- **FR-022**: The system MUST provide enough visible context in elevated-role views to distinguish tenant-wide records from personal records.
- **FR-023**: When a TenantUser creates an appointment, the system MUST automatically assign the appointment to the signed-in user.
- **FR-024**: When a TenantManager or Admin creates an appointment, the system MUST require selection of a User before the appointment can be created.
- **FR-025**: The appointment creation experience MUST prevent TenantUser accounts from changing the assigned User.

### Key Entities

- **User**: A person account that can belong to one or more tenants and may own vehicles and appointments.
- **Tenant**: An organization context that contains users, technicians, service bays, vehicles, and appointments.
- **Role**: The permission level a user has within a tenant, including TenantUser, TenantManager, and Admin.
- **Vehicle**: A tenant-scoped vehicle owned by a user.
- **Appointment**: A tenant-scoped booking owned by a user and optionally associated with a vehicle, technician, and service bay.
- **Technician**: A tenant-scoped service worker visible to all users who can access the tenant.
- **Service Bay**: A tenant-scoped service location or capacity resource visible to all users who can access the tenant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In role-based access tests, TenantUser accounts are blocked from seeing other users' vehicles and appointments in 100% of list, search, filter, refresh, and direct-access scenarios.
- **SC-002**: TenantUser accounts can still view 100% of technicians and service bays belonging to their tenant after vehicle and appointment restrictions are enforced.
- **SC-003**: TenantManager and Admin accounts can switch between tenant-wide and personal vehicle or appointment views in under 10 seconds during normal use.
- **SC-004**: Admin users can select a tenant and arrive at that tenant dashboard in under 30 seconds after login when tenants exist.
- **SC-005**: 100% of existing vehicles and appointments with a resolvable former customer owner remain associated with the correct user after the Customer concept is retired.
- **SC-006**: At least 95% of TenantManager and Admin users in acceptance testing can find the tenant Users tab and identify a tenant user without assistance.
- **SC-007**: No current booking, vehicle, appointment, or tenant-user workflow requires creating or selecting a separate Customer identity.

## Assumptions

- Existing authentication remains in place and already identifies the signed-in user and their role within a tenant.
- Admin is a system-wide role that can select any tenant before entering tenant-scoped views.
- TenantManager is scoped to the active tenant and does not automatically receive cross-tenant access.
- A user's personal vehicles and appointments are still scoped by the active tenant, even when the same user belongs to multiple tenants.
- Technicians and service bays are tenant resources rather than user-owned private records.
- Former Customer ownership can be mapped to User for existing records; unresolved mappings require remediation before records are exposed in normal views.
