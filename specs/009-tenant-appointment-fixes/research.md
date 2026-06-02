# Research: Tenant Appointment Fixes

## 1. CreateAppointmentUseCase Consolidation
**Decision**: Delete `apps/appointment-api-service/src/application/use-cases/crud/appointment/create-appointment.use-case.ts` and ensure `appointment.routes.ts` uses `apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts`.
**Rationale**: The root use case correctly implements hold validations, Redis Stream publishing, and idempotency, adhering to the architecture. The CRUD one bypasses the worker entirely and writes directly to the DB, which violates the CQRS/Event-driven flow outlined in the Constitution.
**Alternatives considered**: Keeping both and differentiating by route. Rejected because direct DB writing for appointments violates the Worker processing rule.

## 2. Switch Tenant Endpoint Fix
**Decision**: The `SwitchTenantUseCase` currently takes `refreshToken` and issues a new token set, but fails to update the user's `lastActiveTenantId` in the database, and possibly the frontend fails if it doesn't provide the `refreshToken` properly. We will ensure it updates `lastActiveTenantId` and works smoothly.
**Rationale**: Updating `lastActiveTenantId` ensures consistency when the user re-authenticates or reloads the application.
**Alternatives considered**: Only relying on JWT claims. Rejected as it doesn't persist the user's last preference across sessions.

## 3. Foreign Key Constraints for `tenant_id`
**Decision**: The current `schema.ts` already defines `.references(() => tenants.id)` for all tenant-bound entities (`customers`, `vehicles`, `serviceTypes`, `technicians`, `serviceBays`, `appointments`). We will generate a new migration to ensure these constraints are physically applied to the PostgreSQL database if they were missing in previous migrations.
**Rationale**: Ensures data integrity at the database level.

## 4. `appointment_stream` Partition Prefixing
**Decision**: Update the stream name generation in `CreateAppointmentUseCase` from `appointments_stream_${partition}` to `tenant:${tenantId}:appointments_stream_${partition}`.
**Rationale**: Strictly complies with Constitution Rule III (Cache Key Matrix) for tenant data isolation in Redis.

## 5. Availability Endpoints and Multi-Day Appointment Search
**Decision**: 
- Add `GET /appointments` multi-day support by refactoring the current same-day filter in the `appointment-api-service` to accept a time range.
- Implement `GET /technicians/available` and `GET /service-bays/available` in `appointment-api-service` using a database query to find resources without overlapping appointments in the given time frame.
**Rationale**: Satisfies User Story 4 and 5. While `bay-service` is dictated by the constitution for complex real-time tracking, since it does not exist yet, we will implement a read-model query in the API service to unblock the scheduler.
**Alternatives considered**: Scaffold `bay-service` entirely. Rejected as out of scope for a "fixes" feature, though it should be migrated later.

## 6. Role Management (Guest, TenantUser, TenantManager, Admin)
**Decision**: Implement logic in auth routes and `user-tenant.repository` to support the required transitions (Guest -> TenantUser -> TenantManager). Guest is defined as a user with no `userTenants` mapping.
**Rationale**: Required by User Story 1.
