# Feature Specification: Multi-Tenant Vehicle Service Appointment API

**Feature Branch**: `003-multi-tenant-api`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "Create an API service spec for a multi-tenant vehicle service appointment system. The API must provide full CRUD endpoints for: Tenant, Customer, Vehicle, ServiceType, Technician, TechnicianSkill, ServiceBay, Appointment. Multi-tenancy with data isolation, JWT access+refresh token authentication, RBAC with Admin and TenantUser roles, x-tenant-id header for tenant context, and /login + /register auth endpoints."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Tenant Admin Manages Their Team & Service Catalog (Priority: P1)

A tenant administrator (e.g., the manager of "Speedy Auto Repair") logs in and manages their shop's operational data: they create service types (e.g., "Oil Change", "Brake Pad Replacement"), register technicians, assign skills to technicians, and configure service bays. They can view, update, and deactivate any of this data, and they can only ever see records belonging to their own shop.

**Why this priority**: This is the foundation that all appointment booking depends on. Without a configured service catalog, technicians, and bays, no appointment can be created.

**Independent Test**: A fresh tenant admin account can fully exercise service-catalog and technician management — creating, reading, updating, and deleting each entity — without involving the appointment booking flow.

**Acceptance Scenarios**:

1. **Given** an authenticated TenantUser with admin role for Tenant A (JWT contains `tenant_id = A` and `x-tenant-id: A` header is sent), **When** they call `POST /service-types` with valid data, **Then** a new ServiceType is created and returned with `tenant_id` equal to Tenant A's ID.
2. **Given** an authenticated TenantUser for Tenant A, **When** they call `GET /service-types`, **Then** only ServiceTypes belonging to Tenant A are returned, never those of Tenant B.
3. **Given** an authenticated TenantUser for Tenant A, **When** they send `GET /service-types` with `x-tenant-id: B` (Tenant B's ID), **Then** the system returns `403 Forbidden` because the header does not match their JWT `tenant_id` claim.
4. **Given** an authenticated TenantUser for Tenant A, **When** they call `POST /technicians` and then `POST /technician-skills` linking that technician to a ServiceType, **Then** the skill association is persisted and visible when fetching the technician's profile.
5. **Given** a TenantUser tries to delete a ServiceType that is referenced by an active future Appointment, **When** `DELETE /service-types/{id}` is called, **Then** the system returns `409 Conflict` with a message indicating the dependency.

---

### User Story 2 — Staff Books an Appointment for a Customer (Priority: P1)

A service advisor (TenantUser) looks up an existing customer and their vehicle, selects an available time slot, assigns a qualified technician and an open service bay, and creates a confirmed appointment. The system validates that all referenced entities (customer, vehicle, service type, technician, bay) belong to the same tenant and that the time slot is logically valid.

**Why this priority**: Appointment creation is the core transactional action of the system.

**Independent Test**: Given pre-existing Customer, Vehicle, ServiceType, Technician with matching skill, and ServiceBay, a TenantUser can create an Appointment via `POST /appointments` (with the correct `x-tenant-id` header) and receive a confirmed record back.

**Acceptance Scenarios**:

1. **Given** a TenantUser authenticated for Tenant A with all referenced entities (Customer, Vehicle, ServiceType, Technician, ServiceBay) existing under Tenant A, **When** they `POST /appointments` with `x-tenant-id: A` and `end_time > start_time`, **Then** the appointment is created with status `PENDING` and all foreign-key IDs are returned.
2. **Given** a TenantUser, **When** they attempt to create an Appointment referencing a Vehicle that belongs to Tenant B, **Then** the system returns `422 Unprocessable Entity` with a validation error indicating the Vehicle does not belong to this tenant.
3. **Given** a TenantUser, **When** they submit an Appointment with `end_time <= start_time`, **Then** the system returns `400 Bad Request` with a specific field-level error on `end_time`.
4. **Given** a TenantUser, **When** they attempt to create an Appointment without a valid JWT in the `Authorization: Bearer` header, **Then** the system returns `401 Unauthorized`.

---

### User Story 3 — Customer Self-Registers and Views Their Appointments (Priority: P2)

A vehicle owner (Customer) registers themselves under a specific tenant's portal, adding their vehicle(s). They can later query their own appointment history. The system ensures customer email addresses are unique within a tenant.

**Why this priority**: Customer self-service reduces staff workload and is a key user-facing capability, but the core booking flow works without it (staff can create customers manually).

**Independent Test**: A new Customer can be created via `POST /customers` (with `x-tenant-id` header set to Tenant A), a Vehicle linked via `POST /vehicles`, and then `GET /customers/{customerId}/vehicles` returns the correct vehicle list.

**Acceptance Scenarios**:

1. **Given** Tenant A has no customer with email `alice@example.com`, **When** `POST /customers` is called with that email and `x-tenant-id: A`, **Then** a Customer record is created and `201 Created` is returned with the new customer's ID.
2. **Given** Tenant A already has a customer with email `alice@example.com`, **When** another `POST /customers` is submitted with the same email and `x-tenant-id: A`, **Then** the system returns `409 Conflict` with an error indicating duplicate email within this tenant.
3. **Given** Tenant B also has a customer with email `alice@example.com`, **When** Tenant A registers a new customer with the same email (using `x-tenant-id: A`), **Then** it succeeds — emails are only unique per tenant, not globally.
4. **Given** an authenticated TenantUser for Tenant A, **When** `GET /customers/{customerId}/appointments` is called with `x-tenant-id: A`, **Then** only appointments for that customer within Tenant A are returned.

---

### User Story 4 — Platform Admin Manages Tenants and Cross-Tenant Visibility (Priority: P2)

A platform-level administrator (Admin role) manages the lifecycle of tenant organizations: creating new tenants, updating their billing or configuration, and deactivating tenants. The Admin can also query any entity across all tenants for support or auditing purposes without being restricted to a specific tenant scope.

**Why this priority**: Essential for platform operations but not required for tenant-side functionality.

**Independent Test**: An Admin can call `GET /tenants` and receive a list of all tenants, then call `GET /appointments` with `x-tenant-id` set to any tenant's ID and see that tenant's appointments.

**Acceptance Scenarios**:

1. **Given** an authenticated Admin, **When** `POST /tenants` is called with a unique tenant name, **Then** a new Tenant is created and returned with `201 Created`.
2. **Given** an authenticated Admin, **When** `GET /tenants` is called, **Then** all tenants are returned without any tenant-scoping filter.
3. **Given** a TenantUser (non-Admin), **When** they call `POST /tenants`, **Then** the system returns `403 Forbidden`.
4. **Given** an authenticated Admin, **When** they call `DELETE /tenants/{tenantId}`, **Then** the tenant and cascade-related data is soft-deleted or flagged as deactivated.

---

### User Story 5 — View and Filter Appointments (Priority: P3)

A TenantUser lists appointments for a given day or technician, filters by status (PENDING, CONFIRMED, COMPLETED, CANCELLED), and retrieves a single appointment's full detail including all referenced entity names.

**Why this priority**: Useful for operational dashboards, but the core create/update flows work without rich filtering.

**Independent Test**: `GET /appointments?date=2026-06-01` with `x-tenant-id: A` returns only appointments scheduled on that date for Tenant A.

**Acceptance Scenarios**:

1. **Given** Tenant A has 5 appointments on June 1 and 3 on June 2, **When** `GET /appointments?date=2026-06-01` is called with `x-tenant-id: A`, **Then** exactly 5 appointments are returned.
2. **Given** a TenantUser calls `GET /appointments/{appointmentId}` with the correct `x-tenant-id` header, **Then** the response includes customer name, vehicle details, service type name, technician name, and service bay identifier.
3. **Given** a TenantUser calls `GET /appointments?status=PENDING` with the correct `x-tenant-id` header, **Then** only appointments with status `PENDING` are returned.

---

### Edge Cases

- What happens when a Technician is assigned to an Appointment but their skill for that ServiceType is later revoked? The system must still retain the historical appointment record without modification to past data.
- What happens if a Customer's Vehicle is soft-deleted while it is referenced by a future Appointment? The system must reject the deletion with a `409 Conflict` response.
- What happens when the JWT access token is expired or tampered with? The system must return `401 Unauthorized` on every protected endpoint.
- What happens when the `x-tenant-id` header is missing on a tenant-scoped request? The system must return `400 Bad Request` indicating the header is required.
- What happens when the `x-tenant-id` header value does not match the `tenant_id` claim in the JWT? The system must return `403 Forbidden`.
- What happens when a paginated list endpoint is called with an out-of-range page number? The system must return an empty results array, not an error.
- What happens if the same ServiceBay or Technician is double-booked for overlapping time slots? The system must return a `409 Conflict` with details about the conflicting appointment.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Auth Endpoints (Public)

- **FR-001**: The system MUST expose a `POST /auth/register` endpoint that accepts `email`, `password`, `firstName`, `lastName`, and optional `tenantId`. On success it returns `201 Created` with an `accessToken`, `refreshToken`, the created user profile (without password), and the active tenant context if a `tenantId` was provided.
- **FR-002**: If `tenantId` is supplied at registration, the system MUST verify the tenant exists; if not found it MUST return `404 Not Found`. If it exists, a `UserTenant` membership is created for that user under that tenant, and tokens are issued immediately.
- **FR-003**: If `tenantId` is omitted at registration, the user account is created without a tenant and tokens are NOT issued; the response MUST include `accessToken: ""` and `refreshToken: ""` with a message indicating the account is pending tenant assignment by an Admin.
- **FR-004**: The system MUST expose a `POST /auth/login` endpoint that accepts `email` and `password`. On success it returns `200 OK` with an `accessToken`, `refreshToken`, the authenticated user profile, `currentTenant`, `tenants` (list of all tenants the user belongs to), and `hasMultipleTenants` flag.
- **FR-005**: Login MUST fail with `401 Unauthorized` if credentials are invalid, the account is deactivated, or the user has no active tenant membership.
- **FR-006**: The system MUST expose a `POST /auth/refresh` endpoint that accepts a `refreshToken` string. On success it returns `200 OK` with a new `accessToken`. The refresh token MUST be checked for revocation and expiry; a revoked or expired token MUST return `401 Unauthorized`.
- **FR-007**: The system MUST expose a `POST /auth/logout` endpoint that accepts a `refreshToken` string and marks it as revoked in the system. On success it returns `200 OK`.
- **FR-008**: The system MUST expose a `POST /auth/switch-tenant` endpoint (authenticated) that accepts a `tenantId` and issues new `accessToken` and `refreshToken` scoped to that tenant, validating that the user is an active member of the target tenant.
- **FR-009**: The system MUST expose a `GET /auth/tenants` endpoint (authenticated) that returns the list of all tenants the currently authenticated user belongs to.

#### JWT Token Structure & Verification

- **FR-010**: The access token payload MUST contain: `sub` (user ID), `tenant_id` (UUID of the active tenant, or null for platform Admins), `role` (one of `Admin`, `TenantUser`), `permissions` (array of fine-grained permission strings), and `isSuperAdmin` (boolean).
- **FR-011**: Access tokens MUST have a short expiry (default: 15 minutes). Refresh tokens MUST have a longer expiry (default: 7 days) and MUST be stored server-side with a `isRevoked` flag to support explicit revocation on logout.
- **FR-012**: The system MUST reject all non-public requests with missing, expired, or tampered access tokens with `401 Unauthorized`.
- **FR-013**: A user with `isSuperAdmin: true` in their JWT MUST bypass all role and tenant checks and be granted full access across all resources.

#### Tenant Context via Header

- **FR-014**: All tenant-scoped requests MUST include an `x-tenant-id` HTTP header containing the UUID of the target tenant.
- **FR-015**: The system MUST validate that the `x-tenant-id` header value exactly matches the `tenant_id` claim in the authenticated user's JWT. A mismatch MUST return `403 Forbidden`. If the header is absent entirely, the system MUST return `400 Bad Request`.
- **FR-016**: Admin users (`isSuperAdmin: true` or `role: Admin`) are exempt from the `x-tenant-id` ↔ JWT `tenant_id` match check; they may supply any valid tenant UUID in the header to scope their queries to that tenant.

#### Multi-Tenancy & Data Isolation

- **FR-017**: Every tenant-scoped entity (Customer, Vehicle, ServiceType, Technician, TechnicianSkill, ServiceBay, Appointment) MUST carry a `tenant_id` field that is set automatically from the validated `x-tenant-id` header on create; clients MUST NOT be able to supply `tenant_id` in the request body.
- **FR-018**: All read queries for tenant-scoped entities MUST apply a `tenant_id` equality filter derived from the validated `x-tenant-id` header, ensuring no cross-tenant data leakage.
- **FR-019**: All mutating operations (create, update, delete) on tenant-scoped entities MUST confirm that the stored record's `tenant_id` matches the validated `x-tenant-id` header before proceeding; violations MUST return `403 Forbidden`.
- **FR-020**: When creating a new Appointment, the system MUST verify that the referenced Customer, Vehicle, ServiceType, Technician, and ServiceBay all carry the same `tenant_id` as the validated `x-tenant-id` header; any mismatch MUST return `422 Unprocessable Entity` with a field-level error.

#### CRUD — Tenant

- **FR-011**: The system MUST provide endpoints to Create, Read (single and list), Update, and Delete (soft-delete) Tenant records.
- **FR-012**: Tenant name MUST be unique across the system; duplicate names MUST return `409 Conflict`.

#### CRUD — Customer

- **FR-013**: The system MUST provide tenant-scoped endpoints to Create, Read, Update, and Delete Customer records.
- **FR-014**: Customer email address MUST be unique within a tenant; a duplicate email within the same tenant MUST return `409 Conflict`. The same email is allowed across different tenants.
- **FR-015**: Customer records MUST NOT be hard-deleted if they are referenced by any Appointment; the system MUST return `409 Conflict` in this case.

#### CRUD — Vehicle

- **FR-016**: The system MUST provide tenant-scoped endpoints to Create, Read, Update, and Delete Vehicle records.
- **FR-017**: A Vehicle MUST be associated with exactly one Customer from the same tenant.
- **FR-018**: Vehicle records MUST NOT be deleted if referenced by any future or active Appointment; the system MUST return `409 Conflict`.

#### CRUD — ServiceType

- **FR-019**: The system MUST provide tenant-scoped endpoints to Create, Read, Update, and Delete ServiceType records.
- **FR-020**: ServiceType name MUST be unique within a tenant; duplicates MUST return `409 Conflict`.
- **FR-021**: ServiceType records MUST NOT be deleted if referenced by any active future Appointment; the system MUST return `409 Conflict`.

#### CRUD — Technician

- **FR-022**: The system MUST provide tenant-scoped endpoints to Create, Read, Update, and Delete Technician records.
- **FR-023**: Technician email MUST be unique within a tenant.

#### CRUD — TechnicianSkill

- **FR-024**: The system MUST provide tenant-scoped endpoints to Create and Delete TechnicianSkill associations, and to Read the list of skills for a given Technician.
- **FR-025**: A TechnicianSkill association MUST reference a Technician and a ServiceType that both belong to the same tenant.
- **FR-026**: Duplicate TechnicianSkill associations (same Technician + ServiceType pair) MUST return `409 Conflict`.

#### CRUD — ServiceBay

- **FR-027**: The system MUST provide tenant-scoped endpoints to Create, Read, Update, and Delete ServiceBay records.
- **FR-028**: ServiceBay identifier/name MUST be unique within a tenant.

#### CRUD — Appointment

- **FR-029**: The system MUST provide tenant-scoped endpoints to Create, Read (single and list with filters), Update, and Cancel (soft-delete) Appointment records.
- **FR-030**: The `end_time` of an Appointment MUST be strictly greater than `start_time`; violations MUST return `400 Bad Request` with a field-level validation error.
- **FR-031**: The system MUST detect and reject double-booking of the same Technician or ServiceBay for overlapping time slots; overlap conflicts MUST return `409 Conflict` with the conflicting appointment's ID (The create appointment feature is already implemented, check if it is missing authorization or not. If not missing anything, then don't touch it.)
- **FR-032**: Appointment `start_time` MUST NOT be in the past at creation time; violations MUST return `400 Bad Request`.
- **FR-033**: The system MUST support filtering Appointments by `date`, `status`, `technician_id`, and `service_bay_id` via query parameters.
- **FR-034**: Appointment status transitions MUST follow the allowed sequence: `PENDING → CONFIRMED → COMPLETED` or `PENDING/CONFIRMED → CANCELLED`; invalid status transitions MUST return `422 Unprocessable Entity`.

#### Input Validation — General

- **FR-035**: All string fields with a maximum length MUST be validated; violations MUST return `400 Bad Request` with field-level error details.
- **FR-036**: All required fields MUST be validated for presence; missing required fields MUST return `400 Bad Request` with field-level error details.
- **FR-037**: All error responses MUST use a consistent JSON error body with `code`, `message`, and optional `details` array for field-level errors.

### Key Entities

- **User**: A platform-level account identified by a globally unique email, hashed password, first/last name, role, permissions array, and `isSuperAdmin` flag. A User can belong to multiple tenants via UserTenant memberships.
- **UserTenant**: A join record that associates a User with a Tenant, carrying a per-tenant `role` and `permissions` array. A user may switch between their memberships to obtain tenant-scoped tokens.
- **RefreshToken**: A server-side record of an issued refresh token, carrying the associated `userId`, `tenantId`, expiry timestamp, and a `isRevoked` flag. Used to support token refresh and explicit logout.
- **Tenant**: Represents an independent service shop or business. Has a unique name, contact email, and active/inactive status.
- **Customer**: A vehicle owner registered under a specific tenant. Has name, email (unique per tenant), and phone.
- **Vehicle**: A car or vehicle owned by one Customer within a tenant. Identified by license plate, make, model, and year.
- **ServiceType**: A category of service offered by a tenant (e.g., "Oil Change"). Has name (unique per tenant) and estimated duration.
- **Technician**: A staff member capable of performing services within a tenant. Has name, email (unique per tenant), and active status.
- **TechnicianSkill**: A join entity linking a Technician to a ServiceType they are qualified to perform (many-to-many). Both sides must belong to the same tenant.
- **ServiceBay**: A physical workspace within a tenant's facility where service is performed. Has an identifier/name unique per tenant.
- **Appointment**: A scheduled service event linking Customer, Vehicle, ServiceType, Technician, and ServiceBay within a single tenant. Has start/end time, status, and optional notes.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A TenantUser can complete the full flow — create a Customer, register a Vehicle, and book an Appointment — in under 5 distinct API calls with no manual cross-referencing required.
- **SC-002**: Any attempt to read or modify data belonging to another tenant results in a `403 Forbidden` response 100% of the time, with zero cross-tenant data leakage under automated testing.
- **SC-003**: All validation errors (missing fields, constraint violations, invalid time ranges) are surfaced as structured field-level error responses, enabling client-side form highlighting without additional parsing.
- **SC-004**: The API supports at least 200 concurrent booking requests per tenant without returning `5xx` errors.
- **SC-005**: 100% of endpoints require authentication; unauthenticated requests always receive `401 Unauthorized`.
- **SC-006**: All CRUD endpoints respond within 500 ms at the 95th percentile under normal load.
- **SC-007**: Double-booking of any Technician or ServiceBay for overlapping time windows is rejected with a `409 Conflict` response in 100% of cases.

---

## Assumptions

- The API includes its own `/auth/*` endpoints; JWT tokens are issued and verified by this same service, not an external identity provider.
- The `x-tenant-id` header is the sole mechanism for conveying tenant context; tenant identity is never inferred from URL path segments (no `/tenants/{tenantId}/...` prefix on resource routes).
- Access tokens are short-lived (15 minutes). Clients MUST use the `/auth/refresh` endpoint with a valid, non-revoked refresh token to obtain a new access token without re-authenticating.
- Refresh tokens are stored server-side to allow explicit revocation on logout; a refresh token is single-use in the sense that logging out invalidates it immediately.
- A user may belong to multiple tenants. The `POST /auth/switch-tenant` endpoint issues a new token pair scoped to the chosen tenant, enabling multi-shop staff.
- Platform Admins (`isSuperAdmin: true`) bypass all tenant-scoping checks and may use any valid tenant UUID in the `x-tenant-id` header to query or manage that tenant's data.
- Soft-delete is the preferred deletion strategy for Customers, Vehicles, ServiceTypes, Technicians, ServiceBays, and Appointments to preserve historical appointment integrity.
- Hard-delete is only available to platform Admins for Tenants; this triggers cascaded soft-deletion of all child entities.
- Pagination is provided on all list endpoints via `page` and `page_size` query parameters, with a default page size of 20 and a maximum of 100.
- The system operates in a single time zone per tenant (configured at the Tenant level); all `start_time` and `end_time` fields are stored in UTC and converted for display.
- Overlap detection for Technician and ServiceBay is based on strict time-range intersection: two appointments overlap if `A.start_time < B.end_time AND A.end_time > B.start_time`.
- Mobile support for a customer-facing application is out of scope for this spec; this is a backend API specification only.
- Rate limiting and API key management for external consumers are out of scope for this feature but assumed to be handled by a gateway layer.
