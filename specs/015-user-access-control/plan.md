# Implementation Plan: User Access Control

**Branch**: `015-user-access-control` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-user-access-control/spec.md`

---

## Summary

Replace the separate Customer identity with User ownership across vehicle and appointment workflows, enforce role-based record visibility for TenantUser, TenantManager, and Admin users, add a tenant Users tab for elevated roles, and require Admin users to select a tenant before entering a tenant dashboard. The implementation will update API schemas, repository ports/adapters, worker appointment messages and persistence mappings, UI tabs/forms, and tests so every vehicle and appointment is owned by `user_id` rather than `customer_id`.

---

## Technical Context

**Language/Version**: TypeScript 5.x (API + UI), C# .NET 8 (Worker)

**Primary Dependencies**:
- API: Express, Zod, Drizzle ORM, ioredis, JWT auth middleware
- UI: React 18 + Vite, existing `api.ts` fetch wrapper and dashboard components
- Worker: .NET 8 Background Worker, EF Core, FluentValidation, StackExchange.Redis

**Storage**: PostgreSQL, Redis Streams/cache

**Testing**:
- API and UI-adjacent behavior: Jest unit and integration tests, with specific files run directly per constitution
- Worker: xUnit via `dotnet test`
- Integration: Docker Testcontainers for PostgreSQL and Redis-backed infrastructure tests

**Target Platform**: Docker Compose local/runtime environment

**Project Type**: Cross-service monorepo feature touching the API service, Worker service, and API client UI

**Performance Goals**:
- Tenant-scoped vehicle, appointment, and user list views return within 500 ms p95 for typical tenant-sized data sets
- Admin tenant selection and dashboard entry complete within 30 seconds after login
- Elevated users can switch between tenant-wide and personal tabs within 10 seconds

**Constraints**:
- No new application boundary or Dockerfile
- Preserve tenant isolation on every read and write path
- Use existing port/repository boundaries; Domain and Application layers must not import infrastructure clients
- Use `user_id` ownership for new vehicle and appointment records; do not create or require Customer records
- Keep Redis keys tenant-prefixed and canonical
- Use static imports with path aliases for all internal TypeScript imports
- Tests must be written before implementation per constitution

**Scale/Scope**:
- One monorepo feature across `apps/appointment-api-service`, `apps/appointment-worker-service`, and `apps/api-client-ui`
- Covers Customer retirement from active workflows, role-scoped reads, tenant user listing, Admin tenant selection, and appointment creation owner selection
- Does not introduce a separate identity provider or redesign authentication beyond required tenant/role context propagation

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Exactly 3 service boundaries | Pass | No new service boundaries; changes remain in API, Worker, and UI client. |
| I — API role separation | Pass with existing-system constraint | Plan uses existing API repository ports/adapters for current CRUD surfaces and does not add persistence logic outside established adapters. |
| I — Worker role separation | Pass | Worker remains a background consumer; no HTTP endpoints added. |
| I — Bay service role separation | Pass | Bay service is not changed; technicians and bays remain tenant resources. |
| II — Ports & adapters | Pass | API and Worker changes are planned through ports/use cases/adapters, not direct infrastructure imports in Domain/Application layers. |
| III — Tenant isolation | Pass | Every list/detail/create path must derive tenant scope from authenticated context and enforce role-based filters server-side. |
| III — Cache key format | Pass | Appointment cache payload fields change from `customer_id` to `user_id`; keys remain `tenant:{tenant_id}:...`. |
| IV — TDD gate | Pass | Plan requires failing tests before implementation for access filtering, schema migration, message contracts, and UI role behavior. |
| V — Contracts first | Pass | OpenAPI contract is generated in this plan before tasks/implementation. |
| VI — Monorepo and Docker | Pass | No repository split, no new Dockerfiles, no new Docker Compose service. |

**Initial gate result**: Pass. The API already contains persistence adapters for current CRUD behavior; this plan keeps changes inside those established boundaries and does not add direct database access to Domain/Application code.

---

## Project Structure

### Documentation (this feature)

```text
specs/015-user-access-control/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code Affected

```text
apps/appointment-api-service/
├── openapi.yaml                                      [MODIFY] sync public API contract
├── seed/
│   ├── tables.sql                                    [MODIFY] replace customers ownership with users
│   └── seed.sql                                      [MODIFY] seed vehicles/appointments with user_id
├── src/
│   ├── application/
│   │   ├── commands/
│   │   │   ├── create-appointment.command.ts         [MODIFY] userId role-aware request contract
│   │   │   ├── appointment.command.ts                [MODIFY] user filters/status update contract
│   │   │   └── vehicle.command.ts                    [MODIFY] replace customerId with userId
│   │   ├── ports/repositories/
│   │   │   ├── appointment-crud.repository.port.ts   [MODIFY] user ownership filters
│   │   │   ├── vehicle.repository.port.ts            [MODIFY] findByUser / scoped reads
│   │   │   ├── user.repository.port.ts               [MODIFY] tenant user list shape if needed
│   │   │   └── customer.repository.port.ts           [REMOVE]
│   │   └── use-cases/
│   │       ├── create-appointment.use-case.ts        [MODIFY] publish userId and cache user_id
│   │       ├── get-active-appointments.use-case.ts   [MODIFY] role/user filtering
│   │       ├── crud/appointment/*                    [MODIFY] tenant/user scope checks
│   │       ├── crud/vehicle/*                        [MODIFY] tenant/user scope checks
│   │       ├── crud/customer/*                       [REMOVE]
│   │       └── tenant/list-tenant-users.use-case.ts  [MODIFY] TenantManager/Admin-only behavior
│   ├── domain/
│   │   ├── entities/customer.entity.ts               [REMOVE]
│   │   ├── entities/appointment.entity.ts            [MODIFY] customerId -> userId
│   │   ├── entities/vehicle.entity.ts                [MODIFY] customerId -> userId
│   │   └── value-objects/customer-id.ts              [REMOVE or replace with user-id value object]
│   └── infrastructure/
│       ├── db/
│       │   ├── schema.ts                             [MODIFY] remove customers table, add user_id FKs/indexes
│       │   ├── migrations/                           [ADD] migration from customer_id to user_id
│       │   └── repositories/
│       │       ├── drizzle-customer.repository.ts    [REMOVE]
│       │       ├── drizzle-vehicle.repository.ts     [MODIFY]
│       │       ├── drizzle-appointment-crud.repository.ts [MODIFY]
│       │       └── drizzle-user.repository.ts        [MODIFY]
│       ├── di/container.ts                           [MODIFY] remove customer repository binding
│       └── http/
│           ├── app.ts                                [MODIFY] remove customers router
│           └── routes/
│               ├── customers.routes.ts               [REMOVE]
│               ├── vehicles.routes.ts                [MODIFY] scope by role/user
│               ├── appointment.routes.ts             [MODIFY] scope by role/user
│               └── tenant.routes.ts                  [MODIFY] header-scoped /users endpoint authorization
└── tests/
    ├── helpers/factories.ts                          [MODIFY] user-owned records
    ├── integration/
    │   ├── customers.e2e.test.ts                     [REMOVE/REPLACE with tenant users coverage]
    │   ├── vehicles.e2e.test.ts                      [MODIFY] user ownership access tests
    │   ├── appointment.e2e.test.ts                   [MODIFY] role-aware userId creation
    │   ├── appointments-list.e2e.test.ts             [MODIFY] TenantUser isolation
    │   ├── tenants.e2e.test.ts                       [MODIFY] Admin tenant selection contract
    │   └── tenant/users.e2e.test.ts                  [ADD]
    └── unit/application/
        ├── create-vehicle.use-case.test.ts           [MODIFY]
        ├── create-appointment.use-case.test.ts       [MODIFY]
        ├── list-appointments.use-case.test.ts        [MODIFY]
        ├── list-vehicles.use-case.test.ts            [ADD/MODIFY]
        └── list-tenant-users.use-case.test.ts        [ADD/MODIFY]

apps/appointment-worker-service/
├── src/
│   ├── Core/Domain/Entities/
│   │   ├── AppointmentMessage.cs                     [MODIFY] CustomerId -> UserId
│   │   ├── TrackingRecord.cs                         [MODIFY] CustomerId -> UserId
│   │   └── AppointmentReminderData.cs                [MODIFY] customer fields -> user fields
│   ├── Core/Application/
│   │   ├── UseCases/AppointmentProcessor.cs          [MODIFY] persist/cache user_id
│   │   └── Validators/AppointmentMessageValidator.cs [MODIFY] validate UserId
│   ├── Infrastructure/Data/
│   │   ├── AppDbContext.cs                           [MODIFY] mapping and reminder view
│   │   └── Repositories/AppointmentRepository.cs     [MODIFY] user-owned records
│   └── Migrations/                                   [ADD] EF migration aligned to API schema migration
└── tests/
    └── AppointmentWorkerService.Tests.Unit/
        └── Application/*                             [MODIFY] user_id message/cache assertions

apps/api-client-ui/
├── src/
│   ├── api.ts                                        [MODIFY] remove customers API, add role-scoped users/vehicles/appointments helpers
│   ├── types.ts                                      [MODIFY] remove Customers entity, add Users/personal tabs
│   ├── formSchemas.ts                                [MODIFY] vehicle userId field, remove Customers schema
│   ├── App.tsx                                      [MODIFY] Admin tenant selection before dashboard
│   ├── useAuth.tsx                                  [MODIFY] expose userId/role reliably if needed
│   └── components/
│       ├── Dashboard.tsx                             [MODIFY] Users tab, tenant/personal tabs, role-specific tabs
│       ├── AppointmentModal.tsx                      [MODIFY] TenantUser auto-owner, elevated user selector
│       └── TenantSelector.tsx                        [MODIFY] Admin all-tenant selection flow if needed
```

**Structure Decision**: Use the existing monorepo structure and modify the three current applications. The API service owns external HTTP contracts and command validation, the Worker owns stream consumption and appointment persistence, and the UI owns role-appropriate navigation and modal behavior.

---

## Complexity Tracking

> No new constitution violations requiring justification.

---

## Phase 0: Research

See [research.md](./research.md).

---

## Phase 1: Design

See [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), and [quickstart.md](./quickstart.md).

---

## Post-Design Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Exactly 3 service boundaries | Pass | Design modifies the existing services only. |
| I — API role separation | Pass with existing-system constraint | HTTP handlers call use cases and repository ports; no persistence logic moves into controllers or Domain/Application internals. |
| I — Worker role separation | Pass | Worker only consumes messages, validates, persists appointments, and updates cache. |
| II — Ports & adapters | Pass | Repository interfaces and adapters are explicit design targets. |
| III — Tenant isolation | Pass | Contracts require tenant scoping from auth context and role/user filtering for all vehicle and appointment reads. |
| III — Cache key format | Pass | Cache key format is unchanged; cached appointment fields use `user_id`. |
| IV — TDD gate | Pass | Quickstart lists file-specific test commands to run after writing failing tests. |
| V — Contracts first | Pass | OpenAPI contract exists for new/changed HTTP behavior. |
| VI — Monorepo and Docker | Pass | No new apps or Dockerfiles. |

**Post-design gate result**: Pass.

---

## Verification Plan

1. API unit tests:
   - `npx jest tests/unit/application/create-appointment.use-case.test.ts`
   - `npx jest tests/unit/application/create-vehicle.use-case.test.ts`
   - `npx jest tests/unit/application/list-appointments.use-case.test.ts`
   - `npx jest tests/unit/application/list-vehicles.use-case.test.ts`
   - `npx jest tests/unit/application/list-tenant-users.use-case.test.ts`
2. API integration tests:
   - `npx jest --config jest.integration.config.ts tests/integration/appointment.e2e.test.ts`
   - `npx jest --config jest.integration.config.ts tests/integration/appointments-list.e2e.test.ts`
   - `npx jest --config jest.integration.config.ts tests/integration/vehicles.e2e.test.ts`
   - `npx jest --config jest.integration.config.ts tests/integration/tenant/users.e2e.test.ts`
   - `npx jest --config jest.integration.config.ts tests/integration/tenants.e2e.test.ts`
3. Worker tests:
   - `dotnet test` from `apps/appointment-worker-service`
4. UI verification:
   - Run the UI and API locally, sign in as TenantUser, TenantManager, and Admin.
   - Confirm TenantUser sees only personal vehicles/appointments and all tenant technicians/service bays.
   - Confirm TenantManager/Admin see tenant-wide tabs plus personal vehicle/appointment tabs.
   - Confirm TenantManager/Admin can open the Users tab.
   - Confirm Admin sees tenant selection before dashboard and dashboard views are scoped to the selected tenant.
   - Confirm TenantUser appointment creation auto-assigns the current user and elevated roles must choose a user.
