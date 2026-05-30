# Tasks: Multi-Tenant Vehicle Service Appointment API

**Input**: Design documents from `/specs/003-multi-tenant-api/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/openapi.yaml ✅

**TDD Mandate**: Per plan.md Execution Strategy — every implementation task in a phase MUST be preceded by its test tasks. Tests MUST be written first and confirmed to FAIL before implementation begins. No production code without a preceding failing test.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, configure DB connection, migration framework, and test harness before any feature code begins.

- [x] T001 Install new npm dependencies: `drizzle-orm`, `drizzle-kit`, `pg`, `jsonwebtoken`, `bcryptjs`, `@types/jsonwebtoken`, `@types/bcryptjs` in `apps/appointment-api-service/package.json`
- [x] T002 Add `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` to `apps/appointment-api-service/.env.example`
- [x] T003 [P] Create Drizzle client + pool in `apps/appointment-api-service/src/infrastructure/db/client.ts`
- [x] T004 [P] Create Drizzle schema file `apps/appointment-api-service/src/infrastructure/db/schema.ts` with all 11 tables: `users`, `refresh_tokens`, `user_tenants`, `tenants`, `customers`, `vehicles`, `service_types`, `technicians`, `technician_skills`, `service_bays`, `appointments`
- [x] T005 Generate and apply initial migration: `pnpm drizzle-kit generate` → migration file in `apps/appointment-api-service/src/infrastructure/db/migrations/0001_initial.sql`
- [x] T006 [P] Add `postgres` service with health check to root `docker-compose.yml`
- [x] T007 [P] Configure Jest integration test suite in `apps/appointment-api-service/jest.integration.config.ts` with Testcontainers support (PostgreSQL + Redis)
- [x] T008 Create Testcontainers helper in `apps/appointment-api-service/tests/helpers/testcontainers.ts` (starts pg + redis, exposes connection strings)
- [x] T009 [P] Create shared test factory helpers in `apps/appointment-api-service/tests/helpers/factories.ts` (seed tenant, user, customer, vehicle, etc.)

**Checkpoint**: `docker compose up -d postgres redis` boots healthy; `pnpm db:migrate` applies schema; integration test harness starts containers.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure + JWT middleware that ALL user stories depend on. No feature work begins until this phase passes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (Write first — ensure they FAIL before implementing) ⚠️

- [x] T010 [P] Write unit test: JWT service signs access token with correct payload claims (`sub`, `tenant_id`, `role`, `permissions`, `isSuperAdmin`) in `apps/appointment-api-service/tests/unit/infrastructure/jwt.service.test.ts`
- [x] T011 [P] Write unit test: `jwtAuthMiddleware` returns `401` on missing/expired/tampered Bearer token in `apps/appointment-api-service/tests/unit/infrastructure/jwt-auth.middleware.test.ts`
- [x] T012 [P] Write unit test: `tenantContextMiddleware` returns `400` when `x-tenant-id` header is absent; returns `403` when header doesn't match JWT `tenant_id` claim (non-superAdmin); passes for `isSuperAdmin=true` in `apps/appointment-api-service/tests/unit/infrastructure/tenant-context.middleware.test.ts`
- [x] T013 Write unit test: `IUserRepository` port — mock-based tests for `findByEmail`, `create`, `findById` in `apps/appointment-api-service/tests/unit/application/user.repository.mock.test.ts`
- [x] T014 Write unit test: `IRefreshTokenRepository` port — mock-based tests for `create`, `findByToken`, `revoke` in `apps/appointment-api-service/tests/unit/application/refresh-token.repository.mock.test.ts`

### Implementation

- [x] T015 Create `TenantContext` interface (enriched with `userId`, `role`, `permissions`, `isSuperAdmin`) in `apps/appointment-api-service/src/domain/context/tenant-context.ts` — update existing `AsyncLocalStorage` store type
- [x] T016 Create `JwtService` infrastructure utility in `apps/appointment-api-service/src/infrastructure/auth/jwt.service.ts` (sign/verify access tokens using `jsonwebtoken`)
- [x] T017 Create `jwtAuthMiddleware` in `apps/appointment-api-service/src/infrastructure/http/middleware/jwt-auth.middleware.ts` (verifies Bearer token, attaches `req.user`, returns 401 on failure)
- [x] T018 Update `tenantContextMiddleware` in `apps/appointment-api-service/src/infrastructure/http/middleware/tenant-context.middleware.ts` to cross-check `x-tenant-id` header against `req.user.tenant_id` (skip for `isSuperAdmin`); store enriched context in `AsyncLocalStorage`
- [x] T019 Define `IUserRepository` port interface in `apps/appointment-api-service/src/application/ports/repositories/user.repository.port.ts`
- [x] T020 Define `IRefreshTokenRepository` port interface in `apps/appointment-api-service/src/application/ports/repositories/refresh-token.repository.port.ts`
- [x] T021 Define `IUserTenantRepository` port interface in `apps/appointment-api-service/src/application/ports/repositories/user-tenant.repository.port.ts`
- [x] T022 [P] Implement `DrizzleUserRepository` in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-user.repository.ts`
- [x] T023 [P] Implement `DrizzleRefreshTokenRepository` in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-refresh-token.repository.ts`
- [x] T024 [P] Implement `DrizzleUserTenantRepository` in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-user-tenant.repository.ts`
- [x] T025 **Patch existing appointment route** — add `jwtAuthMiddleware` before `tenantContextMiddleware` on `POST /api/v1/appointments` in `apps/appointment-api-service/src/infrastructure/http/app.ts` (closes the authorization gap identified in research.md)
- [x] T026 Update `apps/appointment-api-service/src/infrastructure/di/container.ts` to bind all new repositories and the `JwtService`
- [x] T027 Update `apps/appointment-api-service/src/infrastructure/http/middleware/error-handler.middleware.ts` to handle new exception types (`UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`, `UnprocessableException`)

**Checkpoint**: Existing `POST /api/v1/appointments` now requires a valid JWT. Unit tests T010–T014 all pass (green). `401` on no token, `400` on missing header, `403` on header mismatch.

---

## Phase 3: User Story 1 — Tenant Admin Manages Team & Service Catalog (Priority: P1) 🎯 MVP

**Goal**: Full CRUD for ServiceType, Technician, TechnicianSkill, ServiceBay — all tenant-scoped and isolation-enforced.

**Independent Test**: Authenticated TenantUser can create, read, update, and soft-delete ServiceTypes, Technicians, TechnicianSkills, and ServiceBays — while a request with a mismatched `x-tenant-id` is blocked with 403.

### Tests for US1 — Write first, ensure FAIL ⚠️

- [x] T028 [P] [US1] Write unit test: `CreateServiceTypeUseCase` — creates record; returns `409` on duplicate name; mock `IServiceTypeRepository` in `apps/appointment-api-service/tests/unit/application/create-service-type.use-case.test.ts`
- [x] T029 [P] [US1] Write unit test: `CreateTechnicianUseCase` — creates record; returns `409` on duplicate email; mock `ITechnicianRepository` in `apps/appointment-api-service/tests/unit/application/create-technician.use-case.test.ts`
- [x] T030 [P] [US1] Write unit test: `CreateTechnicianSkillUseCase` — creates association; returns `409` on duplicate; returns `422` when technician/service-type belong to different tenant; mock repos in `apps/appointment-api-service/tests/unit/application/create-technician-skill.use-case.test.ts`
- [x] T031 [P] [US1] Write unit test: `CreateServiceBayUseCase` — creates record; returns `409` on duplicate name; mock `IServiceBayRepository` in `apps/appointment-api-service/tests/unit/application/create-service-bay.use-case.test.ts`
- [x] T032 [P] [US1] Write unit test: `DeleteServiceTypeUseCase` — returns `409` when referenced by active appointment; mock repos in `apps/appointment-api-service/tests/unit/application/delete-service-type.use-case.test.ts`
- [x] T033 [P] [US1] Write integration test: full HTTP round-trip for `POST/GET/PUT/DELETE /service-types` with correct auth + `x-tenant-id`; cross-tenant `403` scenario in `apps/appointment-api-service/tests/integration/service-types.e2e.test.ts`
- [x] T034 [P] [US1] Write integration test: full HTTP round-trip for `POST/GET/PUT/DELETE /technicians` and `POST/DELETE /technician-skills` in `apps/appointment-api-service/tests/integration/technicians.e2e.test.ts`
- [x] T035 [P] [US1] Write integration test: full HTTP round-trip for `POST/GET/PUT/DELETE /service-bays` in `apps/appointment-api-service/tests/integration/service-bays.e2e.test.ts`

### Implementation for US1

- [x] T036 [P] [US1] Define domain entity interfaces: `ServiceType`, `Technician`, `TechnicianSkill`, `ServiceBay` in `apps/appointment-api-service/src/domain/entities/` (4 files)
- [x] T037 [P] [US1] Define port interfaces: `IServiceTypeRepository`, `ITechnicianRepository`, `ITechnicianSkillRepository`, `IServiceBayRepository` in `apps/appointment-api-service/src/application/ports/repositories/` (4 files)
- [x] T038 [P] [US1] Implement Drizzle adapters: `DrizzleServiceTypeRepository`, `DrizzleTechnicianRepository`, `DrizzleTechnicianSkillRepository`, `DrizzleServiceBayRepository` in `apps/appointment-api-service/src/infrastructure/db/repositories/` (4 files) — all queries apply `WHERE tenant_id = ?` from `AsyncLocalStorage`
- [x] T039 [P] [US1] Implement use cases: `CreateServiceTypeUseCase`, `GetServiceTypeUseCase`, `ListServiceTypesUseCase`, `UpdateServiceTypeUseCase`, `DeleteServiceTypeUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/service-type/`
- [x] T040 [P] [US1] Implement use cases: `CreateTechnicianUseCase`, `GetTechnicianUseCase`, `ListTechniciansUseCase`, `UpdateTechnicianUseCase`, `DeleteTechnicianUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/technician/`
- [x] T041 [P] [US1] Implement use cases: `CreateTechnicianSkillUseCase`, `ListTechnicianSkillsUseCase`, `DeleteTechnicianSkillUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/technician-skill/`
- [x] T042 [P] [US1] Implement use cases: `CreateServiceBayUseCase`, `GetServiceBayUseCase`, `ListServiceBaysUseCase`, `UpdateServiceBayUseCase`, `DeleteServiceBayUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/service-bay/`
- [x] T043 [US1] Create Zod validation schemas for all US1 request bodies in `apps/appointment-api-service/src/application/commands/` (4 files: `service-type.command.ts`, `technician.command.ts`, `technician-skill.command.ts`, `service-bay.command.ts`)
- [x] T044 [US1] Create Express routers: `service-type.routes.ts`, `technician.routes.ts`, `technician-skill.routes.ts`, `service-bay.routes.ts` in `apps/appointment-api-service/src/infrastructure/http/routes/` — all guarded by `jwtAuthMiddleware` + `tenantContextMiddleware`
- [x] T045 [US1] Register all US1 routes in `apps/appointment-api-service/src/infrastructure/http/app.ts`
- [x] T046 [US1] Register all US1 repositories and use cases in `apps/appointment-api-service/src/infrastructure/di/container.ts`

**Checkpoint**: All T028–T035 tests pass (green). TenantUser can fully manage service catalog & team. Cross-tenant `403` verified.

---

## Phase 4: User Story 2 — Staff Books an Appointment (Priority: P1)

**Goal**: Full CRUD for Customer, Vehicle, and Appointment (direct PostgreSQL path), including overlap detection and cross-tenant FK validation.

**Independent Test**: Given pre-seeded ServiceType, Technician, ServiceBay — a TenantUser can `POST /appointments` and receive a `201 Created`. Overlapping slot returns `409`. Missing JWT returns `401`.

### Tests for US2 — Write first, ensure FAIL ⚠️

- [x] T047 [P] [US2] Write unit test: `CreateAppointmentCrudUseCase` — validates `end_time > start_time` (400); validates `start_time` in future (400); returns `422` when any FK belongs to different tenant; returns `409` with conflicting appointment ID on technician/bay overlap; mock `IAppointmentCrudRepository` in `apps/appointment-api-service/tests/unit/application/create-appointment-crud.use-case.test.ts`
- [x] T048 [P] [US2] Write unit test: `UpdateAppointmentStatusUseCase` — validates state machine (`PENDING→CONFIRMED` ✅, `COMPLETED→CANCELLED` ❌ → 422); mock repo in `apps/appointment-api-service/tests/unit/application/update-appointment-status.use-case.test.ts`
- [x] T049 [P] [US2] Write integration test: `POST /appointments` with valid body → `201`; overlap → `409`; missing JWT → `401`; cross-tenant FK → `422`; past `start_time` → `400` in `apps/appointment-api-service/tests/integration/appointments-crud.e2e.test.ts`
- [x] T050 [P] [US2] Write integration test: `PATCH /appointments/{id}/status` transitions; invalid transition → `422` in `apps/appointment-api-service/tests/integration/appointment-status.e2e.test.ts`

### Implementation for US2

- [x] T051 [P] [US2] Define domain entity interfaces: `Appointment` in `apps/appointment-api-service/src/domain/entities/appointment.entity.ts`
- [x] T052 [P] [US2] Define `IAppointmentCrudRepository` port with `create`, `findById`, `findAll` (with filters), `updateStatus`, `softDelete`, `findOverlapping` methods in `apps/appointment-api-service/src/application/ports/repositories/appointment-crud.repository.port.ts`
- [x] T053 [US2] Implement `DrizzleAppointmentCrudRepository` in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-appointment-crud.repository.ts` — includes overlap detection query (`start_time < :endTime AND end_time > :startTime`)
- [x] T054 [US2] Implement `CreateAppointmentCrudUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/appointment/create-appointment-crud.use-case.ts` (validates time range, cross-tenant FKs, calls `findOverlapping` for both technician and bay)
- [x] T055 [US2] Implement `UpdateAppointmentStatusUseCase` with state-machine guard in `apps/appointment-api-service/src/application/use-cases/crud/appointment/update-appointment-status.use-case.ts`
- [x] T056 [US2] Implement `CancelAppointmentUseCase` (soft-delete, blocks on `COMPLETED` status → `422`) in `apps/appointment-api-service/src/application/use-cases/crud/appointment/cancel-appointment.use-case.ts`
- [x] T057 [US2] Create Zod schema for appointment create/update in `apps/appointment-api-service/src/application/commands/appointment.command.ts`
- [x] T058 [US2] Create `appointment-crud.routes.ts` router in `apps/appointment-api-service/src/infrastructure/http/routes/appointment-crud.routes.ts` — `POST /appointments`, `GET /appointments/:id`, `PATCH /appointments/:id`, `DELETE /appointments/:id` — guarded by `jwtAuthMiddleware` + `tenantContextMiddleware`
- [x] T059 [US2] Register US2 route and use cases in `app.ts` and `container.ts`

**Checkpoint**: All T047–T050 tests pass (green). Full appointment lifecycle works (create → confirm → complete/cancel). Double-booking blocked with `409`.

---

## Phase 5: User Story 3 — Customer Self-Registration & Vehicle Management (Priority: P2)

**Goal**: Full CRUD for Customer and Vehicle entities, enforcing per-tenant email uniqueness and FK reference guards on deletion.

**Independent Test**: `POST /customers` creates a customer. `POST /customers` with same email + same tenant returns `409`. Same email on different tenant succeeds. `DELETE /customers/{id}` fails with `409` when active appointments exist.

### Tests for US3 — Write first, ensure FAIL ⚠️

- [x] T060 [P] [US3] Write unit test: `CreateCustomerUseCase` — creates customer; returns `409` on duplicate email within tenant; mock `ICustomerRepository` in `apps/appointment-api-service/tests/unit/application/create-customer.use-case.test.ts`
- [x] T061 [P] [US3] Write unit test: `DeleteCustomerUseCase` — returns `409` when `hasActiveAppointments = true`; mock repos in `apps/appointment-api-service/tests/unit/application/delete-customer.use-case.test.ts`
- [x] T062 [P] [US3] Write unit test: `CreateVehicleUseCase` — returns `422` when `customerId` belongs to different tenant; mock repos in `apps/appointment-api-service/tests/unit/application/create-vehicle.use-case.test.ts`
- [x] T063 [P] [US3] Write integration test: `POST/GET/PUT/DELETE /customers`; duplicate email same-tenant → `409`; duplicate email cross-tenant → `201` in `apps/appointment-api-service/tests/integration/customers.e2e.test.ts`
- [x] T064 [P] [US3] Write integration test: `POST/GET/PUT/DELETE /vehicles`; cross-tenant customer → `422` in `apps/appointment-api-service/tests/integration/vehicles.e2e.test.ts`

### Implementation for US3

- [x] T065 [P] [US3] Define domain entity interfaces: `Customer`, `Vehicle` in `apps/appointment-api-service/src/domain/entities/customer.entity.ts` and `vehicle.entity.ts`
- [x] T066 [P] [US3] Define port interfaces: `ICustomerRepository`, `IVehicleRepository` in `apps/appointment-api-service/src/application/ports/repositories/` (2 files)
- [x] T067 [P] [US3] Implement `DrizzleCustomerRepository` in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-customer.repository.ts` — `findByEmail` scoped to tenant; `hasActiveAppointments` guard
- [x] T068 [P] [US3] Implement `DrizzleVehicleRepository` in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-vehicle.repository.ts`
- [x] T069 [P] [US3] Implement use cases: `CreateCustomerUseCase`, `GetCustomerUseCase`, `ListCustomersUseCase`, `UpdateCustomerUseCase`, `DeleteCustomerUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/customer/`
- [x] T070 [P] [US3] Implement use cases: `CreateVehicleUseCase`, `GetVehicleUseCase`, `ListVehiclesUseCase`, `UpdateVehicleUseCase`, `DeleteVehicleUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/vehicle/`
- [x] T071 [US3] Create Zod schemas: `customer.command.ts`, `vehicle.command.ts` in `apps/appointment-api-service/src/application/commands/`
- [x] T072 [US3] Create routers: `customer.routes.ts`, `vehicle.routes.ts` in `apps/appointment-api-service/src/infrastructure/http/routes/` — guarded by `jwtAuthMiddleware` + `tenantContextMiddleware`
- [x] T073 [US3] Register US3 routes and use cases in `app.ts` and `container.ts`

**Checkpoint**: All T060–T064 tests pass (green). Full customer/vehicle lifecycle works. Per-tenant email uniqueness enforced.

---

## Phase 6: User Story 4 — Platform Admin Manages Tenants (Priority: P2)

**Goal**: Admin-only CRUD for Tenant entity. Non-Admin requests return `403`. SuperAdmin header bypass works.

**Independent Test**: Admin calls `POST /tenants` → `201`. Non-Admin call → `403`. Admin calls `DELETE /tenants/{id}` → soft-deletes tenant.

### Tests for US4 — Write first, ensure FAIL ⚠️

- [x] T074 [P] [US4] Write unit test: `CreateTenantUseCase` — creates tenant; returns `409` on duplicate name; mock `ITenantRepository` in `apps/appointment-api-service/tests/unit/application/create-tenant.use-case.test.ts`
- [x] T075 [P] [US4] Write unit test: `adminOnlyMiddleware` (or role guard) — returns `403` when `req.user.role !== 'Admin'` and `isSuperAdmin !== true` in `apps/appointment-api-service/tests/unit/infrastructure/admin-only.middleware.test.ts`
- [x] T076 [P] [US4] Write integration test: `POST/GET/PUT/DELETE /tenants` with Admin token → success; with TenantUser token → `403`; duplicate name → `409` in `apps/appointment-api-service/tests/integration/tenants.e2e.test.ts`

### Implementation for US4

- [x] T077 [P] [US4] Define domain entity interface: `Tenant` in `apps/appointment-api-service/src/domain/entities/tenant.entity.ts`
- [x] T078 [P] [US4] Define `ITenantRepository` port in `apps/appointment-api-service/src/application/ports/repositories/tenant.repository.port.ts`
- [x] T079 [P] [US4] Implement `DrizzleTenantRepository` in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-tenant.repository.ts`
- [x] T080 [P] [US4] Implement use cases: `CreateTenantUseCase`, `GetTenantUseCase`, `ListTenantsUseCase`, `UpdateTenantUseCase`, `DeactivateTenantUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/tenant/`
- [x] T081 [US4] Create `adminOnlyMiddleware` in `apps/appointment-api-service/src/infrastructure/http/middleware/admin-only.middleware.ts` (returns `403` if `req.user.role !== 'Admin'` and `!req.user.isSuperAdmin`)
- [x] T082 [US4] Create `tenant.routes.ts` in `apps/appointment-api-service/src/infrastructure/http/routes/tenant.routes.ts` — guarded by `jwtAuthMiddleware` + `adminOnlyMiddleware`
- [x] T083 [US4] Register US4 route and use cases in `app.ts` and `container.ts`

**Checkpoint**: All T074–T076 tests pass (green). Admin tenant management works; TenantUser calls blocked.

---

## Phase 7: User Story 5 — Auth Endpoints (Register / Login / Refresh / Logout / Switch-Tenant) (Priority: P1)

**Goal**: All 6 `/auth/*` endpoints implemented with correct token issuance, refresh token revocation, and tenant-switching.

**Note**: Placed after entity CRUD phases so auth tests can use seeded tenants and users from DB.

**Independent Test**: Register → Login → get tokens → call protected endpoint → Refresh → call again → Logout → refresh token rejected with `401`.

### Tests for US5-Auth — Write first, ensure FAIL ⚠️

- [x] T084 [P] [US5] Write unit test: `RegisterUseCase` — mock `IUserRepository`, `ITenantRepository`, `IUserTenantRepository`; check `409` on duplicate email in `apps/appointment-api-service/tests/unit/application/register.use-case.test.ts`
- [x] T085 [P] [US5] Write unit test: `LoginUseCase` — check `401` on invalid credentials in `apps/appointment-api-service/tests/unit/application/login.use-case.test.ts`
- [x] T086 [P] [US5] Write unit test: `RefreshTokenUseCase` — check invalid token throws `401` in `apps/appointment-api-service/tests/unit/application/refresh-token.use-case.test.ts`
- [x] T087 [P] [US5] Write unit test: `LogoutUseCase` — verifies token revoked in `apps/appointment-api-service/tests/unit/application/logout.use-case.test.ts`
- [x] T088 [P] [US5] Write unit test: `SwitchTenantUseCase` — verify target tenant validation in `apps/appointment-api-service/tests/unit/application/switch-tenant.use-case.test.ts`
- [x] T089 [P] [US5] Write integration test: Auth Flow (`POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`) in `apps/appointment-api-service/tests/integration/auth.e2e.test.ts`
- [x] T090 [P] [US5] Write integration test: Switch Tenant (`POST /auth/switch-tenant`) returns new tokens in `apps/appointment-api-service/tests/integration/switch-tenant.e2e.test.ts`

### Implementation for US5-Auth

- [x] T093 [P] [US5] Implement `RefreshTokenUseCase` in `apps/appointment-api-service/src/application/use-cases/auth/refresh-token.use-case.ts`
- [x] T094 [P] [US5] Implement `LogoutUseCase` in `apps/appointment-api-service/src/application/use-cases/auth/logout.use-case.ts` (set `is_revoked = true` on refresh token record)
- [x] T095 [US5] Implement `SwitchTenantUseCase` in `apps/appointment-api-service/src/application/use-cases/auth/switch-tenant.use-case.ts` (validate UserTenant membership, revoke old refresh token, issue new token pair)
- [x] T096 [US5] Implement `GetUserTenantsUseCase` in `apps/appointment-api-service/src/application/use-cases/auth/get-user-tenants.use-case.ts`
- [x] T097 [US5] Create Zod schemas for all auth requests in `apps/appointment-api-service/src/application/commands/auth.command.ts`
- [x] T098 [US5] Create `auth.routes.ts` in `apps/appointment-api-service/src/infrastructure/http/routes/auth.routes.ts` — all 6 endpoints (`/register`, `/login`, `/refresh`, `/logout`, `/switch-tenant`, `/tenants`); `/switch-tenant` and `/tenants` guarded by `jwtAuthMiddleware`
- [x] T099 [US5] Register auth route and use cases in `app.ts` and `container.ts`

**Checkpoint**: All T084–T090 tests pass (green). Full auth lifecycle works end-to-end.

---

## Phase 8: User Story 5 (continued) — View & Filter Appointments (Priority: P3)

**Goal**: `GET /appointments` list with filters (`date`, `status`, `technician_id`, `service_bay_id`), pagination, and enriched `GET /appointments/{id}` with joined entity names.

**Independent Test**: `GET /appointments?date=2026-06-01&x-tenant-id=A` returns only that tenant's appointments on that date. Out-of-range page returns empty array.

### Tests for US5-View — Write first, ensure FAIL ⚠️

- [x] T100 [P] [US5] Write unit test: `ListAppointmentsUseCase` — applies date/status/technicianId/bayId filters from query params; returns empty array for out-of-range page; mock repo in `apps/appointment-api-service/tests/unit/application/list-appointments.use-case.test.ts`
- [x] T101 [P] [US5] Write unit test: `GetAppointmentDetailUseCase` — returns enriched appointment with joined customer/vehicle/service-type/technician/bay names; returns `404` for non-existent or cross-tenant ID; mock repo in `apps/appointment-api-service/tests/unit/application/get-appointment-detail.use-case.test.ts`
- [x] T102 [P] [US5] Write integration test: `GET /appointments?date=&status=&technicianId=&serviceBayId=` combinations; cross-tenant isolation; pagination edge cases in `apps/appointment-api-service/tests/integration/appointments-list.e2e.test.ts`

### Implementation for US5-View

- [x] T103 [US5] Implement `ListAppointmentsUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/appointment/list-appointments.use-case.ts` (applies all 4 filters + pagination via `IAppointmentCrudRepository.findAll`)
- [x] T104 [US5] Implement `GetAppointmentDetailUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/appointment/get-appointment-detail.use-case.ts` (joins Customer, Vehicle, ServiceType, Technician, ServiceBay names in a single query)
- [x] T105 [US5] Add `GET /appointments` and enriched `GET /appointments/:id` to `apps/appointment-api-service/src/infrastructure/http/routes/appointment-crud.routes.ts`
- [x] T106 [US5] Update `DrizzleAppointmentCrudRepository.findAll` to accept filter params and return paginated results in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-appointment-crud.repository.ts`

**Checkpoint**: All T100–T102 tests pass (green). Appointment filtering, pagination, and enriched detail all work correctly.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Swagger UI, quickstart validation, OpenAPI integration, final cleanup.

- [x] T107 [P] Add `swagger-ui-express` + serve `contracts/openapi.yaml` at `GET /api/docs` in `apps/appointment-api-service/src/infrastructure/http/app.ts`
- [x] T108 [P] Add structured logging (request ID, tenant ID, duration) to `apps/appointment-api-service/src/infrastructure/http/middleware/request-logger.middleware.ts`
- [x] T109 [P] Run full quickstart.md validation: `POST /auth/register` → `POST /service-types` → `POST /technicians` → `POST /service-bays` → `POST /customers` → `POST /vehicles` → `POST /appointments` — confirm all pass end-to-end
- [x] T110 [P] Update root `docker-compose.yml` with final `appointment-api-service` environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.)
- [x] T111 Update `apps/appointment-api-service/README.md` with service description, env vars, and link to quickstart.md
- [x] T112 Run `eslint` across `apps/appointment-api-service/src/` and fix all errors — constitution Lint Gate

**Checkpoint**: `docker compose up` boots all services. `GET /api/docs` serves Swagger UI. All lint passes. All unit + integration tests green.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phase 3 (US1 — Service Catalog)**: Depends on Phase 2 — can start immediately after
- **Phase 4 (US2 — Appointments)**: Depends on Phase 2 — can start after Phase 2; benefits from US1 entities but independently testable
- **Phase 5 (US3 — Customers/Vehicles)**: Depends on Phase 2 — independent of US1/US2
- **Phase 6 (US4 — Tenant Admin)**: Depends on Phase 2 only — fully independent
- **Phase 7 (US5 — Auth Endpoints)**: Depends on Phase 2 — benefits from DB having tenants, so best after Phase 6
- **Phase 8 (US5 — Appointment Filtering)**: Depends on Phase 4 (needs appointment data + `IAppointmentCrudRepository`)
- **Phase 9 (Polish)**: Depends on all phases complete

### User Story Dependencies

- **US1, US2, US3, US4**: All independently startable after Phase 2
- **US5 Auth**: Best after US4 (needs seeded tenants for integration tests)
- **US5 Filtering**: Depends on US2 (appointment repository)

### Within Each Phase

1. **Tests FIRST** — write all test tasks, run them, confirm they FAIL (red)
2. **Domain entities** — pure TypeScript interfaces, no ORM deps
3. **Port interfaces** — application layer contracts
4. **Repository adapters** — infrastructure layer implementations
5. **Use cases** — application layer orchestration
6. **Routes** — infrastructure HTTP adapters
7. **DI wiring** — bind everything in `container.ts`
8. **Confirm tests GREEN**

### Parallel Opportunities

- Within Phase 2: T010–T014 test writing in parallel
- Within Phase 3: T028–T035 test writing in parallel; T036–T042 implementation in parallel
- US1 (Phase 3), US3 (Phase 5), US4 (Phase 6) can be worked in parallel after Phase 2
- Within each phase: domain entities, port definitions, and repository adapters can all be written in parallel

---

## Parallel Example: Phase 3 (US1)

```bash
# All test-writing tasks can be dispatched in parallel:
Task T028: "Unit test CreateServiceTypeUseCase in tests/unit/application/create-service-type.use-case.test.ts"
Task T029: "Unit test CreateTechnicianUseCase in tests/unit/application/create-technician.use-case.test.ts"
Task T030: "Unit test CreateTechnicianSkillUseCase in tests/unit/application/create-technician-skill.use-case.test.ts"
Task T031: "Unit test CreateServiceBayUseCase in tests/unit/application/create-service-bay.use-case.test.ts"

# All domain entity + port definitions can be dispatched in parallel:
Task T036: "Define ServiceType, Technician, TechnicianSkill, ServiceBay domain entities"
Task T037: "Define IServiceTypeRepository, ITechnicianRepository, ITechnicianSkillRepository, IServiceBayRepository ports"
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (JWT auth, middleware, DB) — **CRITICAL**
3. Complete Phase 3: US1 — Service Catalog & Team management
4. Complete Phase 4: US2 — Appointment booking
5. **STOP and VALIDATE**: Full booking flow works end-to-end (US1 + US2)
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready (auth-guarded routes working)
2. US1 → Service catalog APIs live (MVP increment 1)
3. US2 → Appointment booking live (MVP increment 2 — core product ready)
4. US3 → Customer self-registration live (P2)
5. US4 → Tenant admin live (P2)
6. US5 → Auth endpoints + filtering live (full feature complete)

### TDD Note

Every phase follows: **Red → Green → Refactor**. The `[P]` test tasks in each phase are intentionally listed before the `[P]` implementation tasks. No implementation task should be started until its corresponding test task is written and confirmed failing.

---

## Notes

- `[P]` tasks = different files, no dependencies — safe to run in parallel
- `[Story]` label maps each task to its user story for traceability
- **TDD enforced**: Write tests → confirm FAIL → implement → confirm PASS → refactor
- T025 patches the existing appointment route (authorization gap from research.md) — critical security fix, happens in Phase 2
- The Redis-stream ingestion path (`POST /api/v1/appointments`) remains unchanged except for the JWT middleware being added (T025)
- Soft-delete pattern used for all tenant-scoped entity deletions
- All list endpoints default `page=1`, `pageSize=20`, max `pageSize=100`; out-of-range page returns empty array (not error)
