# Data Model: User Access Control

## User

Represents the single person identity for authentication, tenant membership, vehicle ownership, and appointment ownership.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary identity used as vehicle and appointment owner |
| `email` | string | Unique login/contact identity |
| `first_name` | string | Display name |
| `last_name` | string | Display name |
| `role` | string | Existing global/default role field |
| `is_super_admin` | boolean | Indicates Admin-level cross-tenant capability |
| `last_active_tenant_id` | UUID nullable | Stores selected tenant context when applicable |
| `is_active` | boolean | Inactive users cannot authenticate or own new records |

**Relationships**:
- Many UserTenant memberships
- Many Vehicles through `vehicles.user_id`
- Many Appointments through `appointments.user_id`

**Validation rules**:
- A user must be active to create new appointments or vehicles.
- A user selected by TenantManager/Admin appointment creation must belong to the active tenant.

## UserTenant

Represents a user's role inside a tenant.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Membership identity |
| `user_id` | UUID | References User |
| `tenant_id` | UUID | References Tenant |
| `role` | enum | `TenantUser`, `TenantManager`; Admin is represented by system-wide admin capability |
| `is_active` | boolean | Inactive memberships are not shown or selectable |

**Validation rules**:
- `(user_id, tenant_id)` remains unique.
- TenantManager can list tenant users for their active tenant.
- Admin can list tenant users after selecting a tenant.

## Tenant

Represents the organization context for users, vehicles, appointments, technicians, and service bays.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Tenant identity |
| `name` | string | Display name |
| `is_active` | boolean | Inactive tenants cannot be selected for normal dashboard workflows |

**Relationships**:
- Many UserTenant memberships
- Many Vehicles, Appointments, Technicians, ServiceBays, ServiceTypes

## Vehicle

Represents a tenant-scoped vehicle owned by a User.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Vehicle identity |
| `tenant_id` | UUID | Tenant isolation boundary |
| `user_id` | UUID | Replaces former `customer_id`; references User |
| `vin` | string nullable | Vehicle identifier |
| `license_plate` | string nullable | Vehicle identifier |
| `make` | string | Required |
| `model` | string | Required |
| `year` | integer | Required |
| `deleted_at` | timestamp nullable | Soft-delete marker |

**Relationships**:
- Belongs to User and Tenant
- Has many Appointments

**Validation rules**:
- `user_id` must belong to the same tenant through an active UserTenant membership.
- TenantUser create/list/detail/update/delete behavior is limited to their own `user_id`.
- TenantManager/Admin tenant-wide views may include all vehicles in the active tenant.
- Personal elevated views use `scope=mine` and filter by signed-in `user_id`.

## Appointment

Represents a tenant-scoped booking owned by a User.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Appointment identity |
| `tenant_id` | UUID | Tenant isolation boundary |
| `user_id` | UUID | Replaces former `customer_id`; references User |
| `vehicle_id` | UUID | Vehicle must belong to the same user and tenant unless elevated policy allows booking for selected user |
| `service_type_id` | UUID | Required |
| `technician_id` | UUID | Required unless auto-assigned during creation flow |
| `service_bay_id` | UUID | Required unless auto-assigned during creation flow |
| `start_time` | timestamp | Scheduled/requested start |
| `end_time` | timestamp | Calculated from service duration |
| `actual_start_time` | timestamp nullable | Operational tracking |
| `actual_end_time` | timestamp nullable | Operational tracking |
| `status` | enum/string | Existing appointment status flow |
| `notes` | string nullable | Worker/user-visible result notes |
| `deleted_at` | timestamp nullable | Soft-delete marker |

**Relationships**:
- Belongs to User, Vehicle, Tenant, ServiceType, Technician, and ServiceBay

**Validation rules**:
- TenantUser creation auto-assigns `user_id` to the signed-in user and must not accept a different owner.
- TenantManager/Admin creation requires a selected `user_id` from the active tenant.
- `vehicle_id` must be owned by the selected `user_id` and active tenant.
- TenantUser read access is always limited to own `user_id`.
- TenantManager/Admin tenant-wide views use active tenant scope; personal tabs filter by signed-in `user_id`.

## Technician

Tenant-scoped scheduling resource visible to every authenticated user in the tenant.

**Visibility rule**:
- TenantUser, TenantManager, and Admin can all list all technicians for the active tenant.

## ServiceBay

Tenant-scoped scheduling resource visible to every authenticated user in the tenant.

**Visibility rule**:
- TenantUser, TenantManager, and Admin can all list all service bays for the active tenant.

## Removed Entity: Customer

Customer is retired as a separate table, API resource, UI tab, repository port, domain entity, and stream/cache payload field.

**Removal requirements**:
- Remove customer CRUD from current workflows.
- Replace `customer_id` references with `user_id` in vehicles and appointments.
- Replace `customerId` request/response fields with `userId`.
- Preserve existing ownership only when a former Customer can be mapped to the correct User.

## Migration Rules

1. Add nullable `user_id` to vehicles and appointments.
2. Backfill `user_id` from the former customer owner using a deterministic tenant-safe mapping, expected to be tenant customer email to user email.
3. Mark unresolved records for remediation and exclude them from normal role-scoped views.
4. Enforce `user_id` as required after resolvable records are backfilled.
5. Add indexes:
   - `vehicles(tenant_id, user_id)`
   - `appointments(tenant_id, user_id)`
   - `appointments(tenant_id, status)`
   - Existing technician/bay time indexes remain unchanged.
6. Remove foreign keys to customers and then remove the customers table.

## Cache Shape

Appointment hash keys remain:

```text
tenant:{tenant_id}:appointment:{appointment_id}
```

Appointment hash fields replace:

```text
customer_id -> user_id
```

All active appointment indexes and occupied resource keys remain tenant-prefixed and appointment/resource based.
