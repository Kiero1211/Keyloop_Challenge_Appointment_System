# Quickstart: User Access Control

## Prerequisites

- PostgreSQL and Redis available through the project Docker Compose setup.
- API, Worker, and UI dependencies installed in their existing app directories.
- Active branch: `015-user-access-control`.

## Implementation Order

1. Update structural contracts first.
   - Sync `apps/appointment-api-service/openapi.yaml` with `specs/015-user-access-control/contracts/openapi.yaml`.
   - Update TypeScript command schemas and repository ports to use `userId`.
   - Update Worker `AppointmentMessage` and validator to use `UserId`.

2. Write failing tests.
   - TenantUser cannot list or directly access another user's vehicles or appointments.
   - TenantUser still lists all tenant technicians and service bays.
   - TenantManager/Admin can list tenant-wide vehicles and appointments.
   - TenantManager/Admin can list personal vehicles and appointments with `scope=mine`.
   - TenantManager/Admin can list tenant users through `GET /users` with `x-tenant-id`.
   - Admin must select a tenant before dashboard data loads.
   - TenantUser appointment creation auto-assigns the signed-in user.
   - TenantManager/Admin appointment creation requires selected user.

3. Migrate ownership model.
   - Add `user_id` to vehicles and appointments.
   - Backfill from former Customer ownership using the migration rule in `data-model.md`.
   - Remove Customer routes, ports, entities, repositories, UI tab, tests, and schema references after backfill succeeds.

4. Implement role-aware API behavior.
   - Derive signed-in `userId`, role, and tenant from authenticated context.
   - Enforce TenantUser `mine` scope on vehicles and appointments.
   - Permit TenantManager/Admin `tenant` and `mine` scopes.
   - Require selected tenant context for Admin dashboard APIs.

5. Update Worker behavior.
   - Consume `UserId` in appointment messages.
   - Persist `UserId` to appointments.
   - Write `user_id` in appointment cache hashes.
   - Update reminder projection fields from customer to user.

6. Update UI behavior.
   - Remove Customers tab and Customer form schema.
   - Add Users tab for TenantManager/Admin.
   - Add tenant-wide and personal tabs for elevated vehicle and appointment views.
   - Hide Users tab from TenantUser.
   - In AppointmentModal, auto-assign TenantUser to current user and require User selection for TenantManager/Admin.
   - Require Admin tenant selection before rendering dashboard.

## Test Commands

Run API unit tests by file:

```bash
cd apps/appointment-api-service
npx jest tests/unit/application/create-appointment.use-case.test.ts
npx jest tests/unit/application/create-vehicle.use-case.test.ts
npx jest tests/unit/application/list-appointments.use-case.test.ts
npx jest tests/unit/application/list-vehicles.use-case.test.ts
npx jest tests/unit/application/list-tenant-users.use-case.test.ts
```

Run API integration tests by file:

```bash
cd apps/appointment-api-service
npx jest --config jest.integration.config.ts tests/integration/appointment.e2e.test.ts
npx jest --config jest.integration.config.ts tests/integration/appointments-list.e2e.test.ts
npx jest --config jest.integration.config.ts tests/integration/vehicles.e2e.test.ts
npx jest --config jest.integration.config.ts tests/integration/tenant/users.e2e.test.ts
npx jest --config jest.integration.config.ts tests/integration/tenants.e2e.test.ts
```

Run Worker tests:

```bash
cd apps/appointment-worker-service
dotnet test
```

Run UI checks:

```bash
cd apps/api-client-ui
npm run lint
npm run build
```

## Manual Acceptance Checks

1. Sign in as TenantUser.
   - Vehicles tab shows only the signed-in user's vehicles.
   - Appointments tab shows only the signed-in user's appointments.
   - Technicians and ServiceBays tabs show all tenant resources.
   - Users tab is not available.
   - Appointment creation has no User selector and submits with the signed-in user.

2. Sign in as TenantManager.
   - Users tab is available and lists tenant users only.
   - Tenant-wide vehicle and appointment tabs show all tenant records.
   - Personal vehicle and appointment tabs show only the signed-in user's records.
   - Appointment creation requires selecting a User from the active tenant.

3. Sign in as Admin.
   - Tenant selection appears before dashboard data.
   - Selecting a tenant opens that tenant dashboard.
   - Changing tenants clears the previous tenant's dashboard data.
   - Users, vehicles, and appointments are scoped to the selected tenant.

## Rollback Notes

- Preserve enough migration audit data to remediate unresolved former Customer ownership records after legacy storage is removed.
- Do not expose former Customer records in normal API or UI views during rollback validation.
