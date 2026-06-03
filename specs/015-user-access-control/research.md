# Research: User Access Control

## Decision 1: Replace Customer ownership with User ownership at the data contract boundary

**Decision**: Vehicles and appointments will use `userId` / `user_id` as the owner field. New API request and response shapes must not require `customerId`, and Worker stream payloads must carry `UserId` instead of `CustomerId`.

**Rationale**: The feature intent is to completely remove the Customer table and use User as the single person identity. Keeping `customerId` at any public or stream boundary would preserve the old concept and keep the privacy rules split across two identities.

**Alternatives considered**:
- Keep Customer as an alias of User: rejected because it preserves two names and allows drift between Customer and User behavior.
- Keep Customer in storage only: rejected because the user explicitly requested complete removal of the Customer table.

## Decision 2: Enforce visibility server-side using authenticated role and user context

**Decision**: API use cases must derive role, tenant, and signed-in user from authenticated context and apply role filters server-side. The UI may request `scope=mine` or tenant-wide views, but the backend must decide what is permitted.

**Rationale**: TenantUser privacy cannot depend on UI tab visibility. Direct links, filters, refreshes, and hand-crafted requests must be prevented from disclosing other users' vehicles or appointments.

**Alternatives considered**:
- Filter only in the UI: rejected because it would not protect direct API access.
- Add separate endpoints for every role: rejected because `scope` plus backend authorization keeps the contract smaller while preserving clear tab behavior.

## Decision 3: Use explicit `scope` values for tenant-wide and personal elevated-role tabs

**Decision**: Vehicle and appointment list contracts support `scope=mine` and `scope=tenant`. TenantUser requests are always restricted to `mine`; TenantManager and Admin may use either scope inside the active tenant.

**Rationale**: The spec requires elevated roles to see tenant-wide records and their own records in separate tabs. Explicit scope makes the UI state easy to test and keeps the backend authorization rule unambiguous.

**Alternatives considered**:
- Separate endpoints such as `/appointments/mine`: viable but produces more endpoints for the same resource.
- Implicit filtering based only on role: rejected because elevated users need both tenant-wide and personal views.

## Decision 4: Tenant Users tab uses header-scoped users routes

**Decision**: `GET /api/v1/users` is the contract for tenant user listing, with `x-tenant-id` carrying the active tenant. Access is limited to Admin or TenantManager for that tenant.

**Rationale**: The tenant header already defines the active tenant context throughout the application, so reusing it keeps user listings consistent with every other tenant-scoped request and avoids duplicating tenant identifiers in the path.

**Alternatives considered**:
- Add `/api/v1/tenants/{tenantId}/users`: rejected because it duplicates tenant context already supplied by `x-tenant-id`.

## Decision 5: Admin tenant selection happens before dashboard entry

**Decision**: Admin users are sent to a tenant selection view after login when no tenant is active. Selecting a tenant stores the active tenant context, then dashboard requests use that tenant.

**Rationale**: The spec requires Admin users to choose a tenant before entering a tenant dashboard. The current UI already has a tenant selector path, so the plan strengthens it into a required pre-dashboard step for Admin users.

**Alternatives considered**:
- Show a global dashboard before tenant selection: rejected because it conflicts with explicit tenant context and increases cross-tenant display risk.

## Decision 6: Appointment creation owner behavior is role-specific

**Decision**: TenantUser appointment creation auto-assigns `userId` to the signed-in user and does not expose a user selector. TenantManager and Admin appointment creation requires choosing a tenant user before submission.

**Rationale**: This matches the spec update and prevents ordinary users from creating appointments for another user. Elevated users need to book on behalf of tenant users.

**Alternatives considered**:
- Always require a user selector: rejected because it creates a privacy and usability problem for TenantUser accounts.
- Always auto-assign the signed-in user: rejected because TenantManager/Admin need operational booking on behalf of tenant users.

## Decision 7: Migration must preserve resolvable existing ownership and quarantine unresolved records

**Decision**: Migration maps existing `customers` rows to `users` by a deterministic project-approved key, expected to be email within the same tenant. Vehicles and appointments whose old customer cannot be mapped to a user must be flagged for remediation and excluded from normal role-scoped list results until corrected.

**Rationale**: The spec requires correct ownership preservation and says unresolved mappings must not be assigned incorrectly or exposed broadly. Email is already unique on customers per tenant and users have unique email globally.

**Alternatives considered**:
- Create new users for every customer during migration: rejected because it may create duplicate accounts and unexpected login identities.
- Assign unresolved records to a manager or tenant owner: rejected because it would expose private vehicle and appointment records to the wrong person.

## Decision 8: Cache payloads change fields, keys do not

**Decision**: Appointment cache keys remain `tenant:{tenant_id}:appointment:{appointment_id}` and active index keys remain unchanged, while cached hash fields replace `customer_id` with `user_id`.

**Rationale**: The constitution requires tenant-prefixed keys. The key identity is appointment-based, so only the payload field needs to change.

**Alternatives considered**:
- Add new cache key namespaces for user-owned appointments: rejected because it increases cache migration complexity without improving tenant isolation.
