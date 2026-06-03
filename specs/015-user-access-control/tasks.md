# Tasks: User Access Control

**Input**: Design documents from `specs/015-user-access-control/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: Required by the project constitution. Write each test task first and confirm it fails before implementation.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared foundation is complete.

## Phase 1: Setup

**Purpose**: Align generated contracts and baseline database bootstrap files before implementation starts.

- [ ] T001 Sync the user access control contract into apps/appointment-api-service/openapi.yaml from specs/015-user-access-control/contracts/openapi.yaml
- [ ] T002 [P] Verify apps/appointment-api-service/seed/tables.sql contains user_id ownership columns, no customers table, and user-based appointment_reminder_view
- [ ] T003 [P] Verify apps/appointment-api-service/seed/seed.sql seeds Admin, TenantManager, TenantUser, and user-owned vehicles/appointments
- [ ] T004 [P] Update specs/015-user-access-control/quickstart.md if any verification command changes during implementation

---

## Phase 2: Foundational

**Purpose**: Shared schema, model, contract, and message changes that block all user stories.

**Critical**: No user story implementation should start until this phase is complete.

- [ ] T005 Add failing schema migration test for removing customers and replacing customer_id with user_id in apps/appointment-api-service/tests/integration/schema/user-ownership-migration.test.ts
- [ ] T006 Add failing API contract tests for userId fields and no customerId fields in apps/appointment-api-service/tests/integration/contracts/user-access-contract.test.ts
- [ ] T007 Add failing Worker message contract tests for UserId payloads in apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/Application/AppointmentMessageValidatorTests.cs
- [ ] T008 Update Drizzle schema to remove customers and add vehicles.userId and appointments.userId in apps/appointment-api-service/src/infrastructure/db/schema.ts
- [ ] T009 Add SQL migration from customers/customer_id to users/user_id in apps/appointment-api-service/src/infrastructure/db/migrations/0002_user_access_control.sql
- [ ] T010 Update migration metadata snapshot for user ownership in apps/appointment-api-service/src/infrastructure/db/migrations/meta/_journal.json
- [ ] T011 Update Vehicle domain entity from customerId to userId in apps/appointment-api-service/src/domain/entities/vehicle.entity.ts
- [ ] T012 Update Appointment domain entity from customerId to userId in apps/appointment-api-service/src/domain/entities/appointment.entity.ts
- [ ] T013 Remove Customer domain entity from apps/appointment-api-service/src/domain/entities/customer.entity.ts
- [ ] T014 Remove CustomerId value object or replace it with UserId in apps/appointment-api-service/src/domain/value-objects/customer-id.ts
- [ ] T015 Update create vehicle command schema from customerId to userId in apps/appointment-api-service/src/application/commands/vehicle.command.ts
- [ ] T016 Update appointment command schemas from customerId to userId and scope filters in apps/appointment-api-service/src/application/commands/appointment.command.ts
- [ ] T017 Update create appointment command schema from customerId to role-aware userId in apps/appointment-api-service/src/application/commands/create-appointment.command.ts
- [ ] T018 Update user repository port to support active tenant user validation in apps/appointment-api-service/src/application/ports/repositories/user.repository.port.ts
- [ ] T019 Update vehicle repository port from findByCustomer to findByUser and scoped queries in apps/appointment-api-service/src/application/ports/repositories/vehicle.repository.port.ts
- [ ] T020 Update appointment repository port to support userId filters and scoped detail reads in apps/appointment-api-service/src/application/ports/repositories/appointment-crud.repository.port.ts
- [ ] T021 Remove customer repository port usage from apps/appointment-api-service/src/application/ports/repositories/customer.repository.port.ts
- [ ] T022 Update Drizzle user repository tenant lookup methods in apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-user.repository.ts
- [ ] T023 Update Drizzle vehicle repository from customer ownership to user ownership in apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-vehicle.repository.ts
- [ ] T024 Update Drizzle appointment repository joins and filters from customers to users in apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-appointment-crud.repository.ts
- [ ] T025 Remove Drizzle customer repository binding from apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-customer.repository.ts
- [ ] T026 Update dependency injection container to remove customerRepository and bind updated repositories in apps/appointment-api-service/src/infrastructure/di/container.ts
- [ ] T027 Remove customers router registration from apps/appointment-api-service/src/infrastructure/http/app.ts
- [ ] T028 Remove customers HTTP routes from apps/appointment-api-service/src/infrastructure/http/routes/customers.routes.ts
- [ ] T029 Update test factories to create user-owned vehicles and appointments in apps/appointment-api-service/tests/helpers/factories.ts
- [ ] T030 Update Worker AppointmentMessage from CustomerId to UserId in apps/appointment-worker-service/src/Core/Domain/Entities/AppointmentMessage.cs
- [ ] T031 Update Worker TrackingRecord from CustomerId to UserId in apps/appointment-worker-service/src/Core/Domain/Entities/TrackingRecord.cs
- [ ] T032 Update Worker reminder projection from customer fields to user fields in apps/appointment-worker-service/src/Core/Domain/Entities/AppointmentReminderData.cs
- [ ] T033 Update Worker EF mappings for appointments.user_id and appointment_reminder_view in apps/appointment-worker-service/src/Infrastructure/Data/AppDbContext.cs
- [ ] T034 Update Worker appointment repository persistence for UserId in apps/appointment-worker-service/src/Infrastructure/Data/Repositories/AppointmentRepository.cs
- [ ] T035 Update API startup cache seed to write user_id instead of customer_id in apps/appointment-api-service/src/infrastructure/startup/startup-seed.service.ts
- [ ] T036 Update API cache active appointment DTO from customerId to userId in apps/appointment-api-service/src/application/use-cases/get-active-appointments.use-case.ts
- [ ] T037 Update UI shared entity types to remove Customers and add Users/personal tabs in apps/api-client-ui/src/types.ts
- [ ] T038 Update UI form schemas to remove Customers and replace vehicle customerId with userId in apps/api-client-ui/src/formSchemas.ts
- [ ] T039 Update UI API helpers to remove customer calls and add header-scoped users helpers in apps/api-client-ui/src/api.ts

**Checkpoint**: The codebase understands User ownership everywhere, Customer is removed from active contracts, and user stories can be implemented.

---

## Phase 3: User Story 1 - TenantUser Sees Only Personal Records (Priority: P1)

**Goal**: TenantUser sees only their own vehicles and appointments while still seeing all tenant technicians and service bays.

**Independent Test**: Sign in as TenantUser in a tenant with multiple users and verify only personal vehicles/appointments are visible while all tenant technicians/service bays remain visible.

### Tests for User Story 1

- [ ] T040 [P] [US1] Add failing TenantUser vehicle isolation integration tests in apps/appointment-api-service/tests/integration/vehicles.e2e.test.ts
- [ ] T041 [P] [US1] Add failing TenantUser appointment list/detail isolation integration tests in apps/appointment-api-service/tests/integration/appointments-list.e2e.test.ts
- [ ] T042 [P] [US1] Add failing TenantUser active appointment cache isolation unit tests in apps/appointment-api-service/tests/unit/application/get-active-appointments.use-case.test.ts
- [ ] T043 [P] [US1] Add failing TenantUser technician and service bay visibility integration tests in apps/appointment-api-service/tests/integration/tenant-user-resources.e2e.test.ts

### Implementation for User Story 1

- [ ] T044 [US1] Add authenticated user context access for role and userId in apps/appointment-api-service/src/domain/context/tenant-context.ts
- [ ] T045 [US1] Enforce TenantUser vehicle scope in apps/appointment-api-service/src/application/use-cases/crud/vehicle/list-vehicles.use-case.ts
- [ ] T046 [US1] Enforce TenantUser vehicle detail/update/delete ownership checks in apps/appointment-api-service/src/application/use-cases/crud/vehicle/get-vehicle.use-case.ts
- [ ] T047 [US1] Enforce TenantUser appointment list scope in apps/appointment-api-service/src/application/use-cases/crud/appointment/list-appointments.use-case.ts
- [ ] T048 [US1] Enforce TenantUser appointment detail scope in apps/appointment-api-service/src/application/use-cases/crud/appointment/get-appointment-detail.use-case.ts
- [ ] T049 [US1] Enforce TenantUser active appointment cache filtering in apps/appointment-api-service/src/application/use-cases/get-active-appointments.use-case.ts
- [ ] T050 [US1] Apply role-scoped query handling in appointments router in apps/appointment-api-service/src/infrastructure/http/routes/appointment.routes.ts
- [ ] T051 [US1] Apply role-scoped query handling in vehicles router in apps/appointment-api-service/src/infrastructure/http/routes/vehicles.routes.ts
- [ ] T052 [US1] Keep technician routes tenant-wide for TenantUser in apps/appointment-api-service/src/infrastructure/http/routes/technicians.routes.ts
- [ ] T053 [US1] Keep service bay routes tenant-wide for TenantUser in apps/appointment-api-service/src/infrastructure/http/routes/service-bays.routes.ts
- [ ] T054 [US1] Hide Users tab and tenant-wide vehicle/appointment tabs for TenantUser in apps/api-client-ui/src/components/Dashboard.tsx
- [ ] T055 [US1] Fetch only personal vehicles and appointments for TenantUser in apps/api-client-ui/src/components/Dashboard.tsx

**Checkpoint**: User Story 1 is independently functional and should pass the US1 tests.

---

## Phase 4: User Story 2 - Managers See Tenant-Wide and Personal Views (Priority: P2)

**Goal**: TenantManager and Admin can switch between tenant-wide and personal vehicles/appointments while seeing all tenant technicians and service bays.

**Independent Test**: Sign in as TenantManager or Admin and verify tenant-wide tabs show all tenant records while personal tabs show only the signed-in user's records.

### Tests for User Story 2

- [ ] T056 [P] [US2] Add failing elevated role appointment scope tests in apps/appointment-api-service/tests/integration/appointments-list.e2e.test.ts
- [ ] T057 [P] [US2] Add failing elevated role vehicle scope tests in apps/appointment-api-service/tests/integration/vehicles.e2e.test.ts
- [ ] T058 [P] [US2] Add failing scope query unit tests in apps/appointment-api-service/tests/unit/application/list-appointments.use-case.test.ts
- [ ] T059 [P] [US2] Add failing vehicle scope unit tests in apps/appointment-api-service/tests/unit/application/list-vehicles.use-case.test.ts

### Implementation for User Story 2

- [ ] T060 [US2] Implement scope=mine and scope=tenant handling for appointments in apps/appointment-api-service/src/application/use-cases/crud/appointment/list-appointments.use-case.ts
- [ ] T061 [US2] Implement scope=mine and scope=tenant handling for vehicles in apps/appointment-api-service/src/application/use-cases/crud/vehicle/list-vehicles.use-case.ts
- [ ] T062 [US2] Add userId filter support for elevated appointment queries in apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-appointment-crud.repository.ts
- [ ] T063 [US2] Add userId filter support for elevated vehicle queries in apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-vehicle.repository.ts
- [ ] T064 [US2] Add tenant-wide and personal appointment tabs in apps/api-client-ui/src/components/Dashboard.tsx
- [ ] T065 [US2] Add tenant-wide and personal vehicle tabs in apps/api-client-ui/src/components/Dashboard.tsx
- [ ] T066 [US2] Add scope-aware vehicle and appointment fetch helpers in apps/api-client-ui/src/api.ts

**Checkpoint**: User Stories 1 and 2 work independently.

---

## Phase 5: User Story 3 - Managers and Admins View Tenant Users (Priority: P3)

**Goal**: TenantManager and Admin can open a Users tab that lists only users in the active tenant.

**Independent Test**: Sign in as TenantManager or Admin, open Users tab, verify tenant users are listed, and confirm TenantUser cannot access the tab or endpoint.

### Tests for User Story 3

- [ ] T067 [US3] Add failing header-scoped users endpoint integration tests in apps/appointment-api-service/tests/integration/users.e2e.test.ts
- [ ] T068 [US3] Add failing TenantUser forbidden users endpoint tests in apps/appointment-api-service/tests/integration/users.e2e.test.ts
- [ ] T069 [P] [US3] Add failing list tenant users use case tests in apps/appointment-api-service/tests/unit/application/list-tenant-users.use-case.test.ts

### Implementation for User Story 3

- [ ] T070 [US3] Update ListTenantUsersUseCase to enforce TenantManager/Admin only in apps/appointment-api-service/src/application/use-cases/tenant/list-tenant-users.use-case.ts
- [ ] T071 [US3] Add header-scoped GET /api/v1/users route in apps/appointment-api-service/src/infrastructure/http/routes/users.routes.ts
- [ ] T072 [US3] Add POST /api/v1/users tenant assignment route in apps/appointment-api-service/src/infrastructure/http/routes/users.routes.ts
- [ ] T073 [US3] Add PUT /api/v1/users/:userId/role route in apps/appointment-api-service/src/infrastructure/http/routes/users.routes.ts
- [ ] T074 [US3] Register users router in apps/appointment-api-service/src/infrastructure/http/app.ts
- [ ] T075 [US3] Remove tenant-id path user management routes from apps/appointment-api-service/src/infrastructure/http/routes/tenant.routes.ts
- [ ] T076 [US3] Add Users tab and tenant user table rendering in apps/api-client-ui/src/components/Dashboard.tsx
- [ ] T077 [US3] Update tenant user API calls to use /api/v1/users with x-tenant-id in apps/api-client-ui/src/api.ts

**Checkpoint**: User Stories 1 through 3 work independently.

---

## Phase 6: User Story 4 - Admin Chooses Tenant Before Dashboard (Priority: P4)

**Goal**: Admin sees all tenants after login, selects one, and only then enters the selected tenant dashboard.

**Independent Test**: Sign in as Admin, verify tenant selection appears before dashboard, choose a tenant, and verify dashboard data is scoped to that tenant.

### Tests for User Story 4

- [ ] T078 [P] [US4] Add failing Admin tenant selection integration tests in apps/appointment-api-service/tests/integration/tenants.e2e.test.ts
- [ ] T079 [P] [US4] Add failing switch tenant Admin context tests in apps/appointment-api-service/tests/unit/application/switch-tenant.use-case.test.ts

### Implementation for User Story 4

- [ ] T080 [US4] Ensure Admin can list all active tenants in apps/appointment-api-service/src/application/use-cases/crud/tenant/list-tenants.use-case.ts
- [ ] T081 [US4] Ensure Admin switch tenant preserves admin capability and selected tenant in apps/appointment-api-service/src/application/use-cases/auth/switch-tenant.use-case.ts
- [ ] T082 [US4] Require selected tenant before dashboard rendering in apps/api-client-ui/src/App.tsx
- [ ] T083 [US4] Update Admin tenant selector to list all tenants and set active tenant in apps/api-client-ui/src/components/TenantSelector.tsx
- [ ] T084 [US4] Clear previous tenant dashboard state when Admin changes tenant in apps/api-client-ui/src/components/Dashboard.tsx
- [ ] T085 [US4] Persist selected tenant and user role consistently in apps/api-client-ui/src/useAuth.tsx

**Checkpoint**: User Stories 1 through 4 work independently.

---

## Phase 7: User Story 5 - Customer Concept Is Replaced By User (Priority: P5)

**Goal**: All workflows use User as owner identity, TenantUser appointment creation auto-assigns current user, and elevated roles choose a User in the appointment modal.

**Independent Test**: Create/view vehicles and appointments across roles and verify User ownership is used everywhere with no Customer UI/API dependency.

### Tests for User Story 5

- [ ] T086 [P] [US5] Add failing create appointment userId command tests in apps/appointment-api-service/tests/unit/application/create-appointment.use-case.test.ts
- [ ] T087 [P] [US5] Add failing create vehicle userId command tests in apps/appointment-api-service/tests/unit/application/create-vehicle.use-case.test.ts
- [ ] T088 [P] [US5] Add failing Worker appointment processor UserId tests in apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/Application/AppointmentProcessorCacheTests.cs
- [ ] T089 [P] [US5] Add failing API create appointment role behavior tests in apps/appointment-api-service/tests/integration/appointment.e2e.test.ts
- [ ] T090 [P] [US5] Add failing UI appointment modal role behavior tests in apps/api-client-ui/src/components/AppointmentModal.test.tsx

### Implementation for User Story 5

- [ ] T091 [US5] Implement TenantUser automatic userId assignment in apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts
- [ ] T092 [US5] Implement TenantManager/Admin required selected userId validation in apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts
- [ ] T093 [US5] Validate vehicle belongs to selected user and tenant in apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts
- [ ] T094 [US5] Implement create vehicle user ownership validation in apps/appointment-api-service/src/application/use-cases/crud/vehicle/create-vehicle.use-case.ts
- [ ] T095 [US5] Publish UserId in appointment stream payloads in apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts
- [ ] T096 [US5] Write user_id in appointment cache hashes in apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts
- [ ] T097 [US5] Consume UserId and persist it in Worker appointment processing in apps/appointment-worker-service/src/Core/Application/UseCases/AppointmentProcessor.cs
- [ ] T098 [US5] Update Worker validation messages from CustomerId to UserId in apps/appointment-worker-service/src/Core/Application/Validators/AppointmentMessageValidator.cs
- [ ] T099 [US5] Remove Customers tab and customer form handling in apps/api-client-ui/src/components/Dashboard.tsx
- [ ] T100 [US5] Load tenant users and show User selector for TenantManager/Admin in apps/api-client-ui/src/components/AppointmentModal.tsx
- [ ] T101 [US5] Auto-assign current user and hide User selector for TenantUser in apps/api-client-ui/src/components/AppointmentModal.tsx
- [ ] T102 [US5] Filter appointment modal vehicle options by selected user in apps/api-client-ui/src/components/AppointmentModal.tsx
- [ ] T103 [US5] Remove customer API helper exports from apps/api-client-ui/src/api.ts
- [ ] T104 [US5] Remove customer E2E test file or replace it with users coverage in apps/appointment-api-service/tests/integration/customers.e2e.test.ts

**Checkpoint**: All user stories are independently functional, and no active workflow requires Customer.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verification, cleanup, and documentation across the completed feature.

- [ ] T105 [P] Update API README examples from customerId to userId in apps/appointment-api-service/README.md
- [ ] T106 [P] Update UI README workflow notes for Users and personal tabs in apps/api-client-ui/README.md
- [ ] T107 [P] Search and remove remaining active customer references in apps/appointment-api-service/src
- [ ] T108 [P] Search and remove remaining active customer references in apps/api-client-ui/src
- [ ] T109 [P] Search and remove remaining active CustomerId references in apps/appointment-worker-service/src
- [ ] T110 Run API unit tests listed in specs/015-user-access-control/quickstart.md
- [ ] T111 Run API integration tests listed in specs/015-user-access-control/quickstart.md
- [ ] T112 Run Worker dotnet test from apps/appointment-worker-service
- [ ] T113 Run UI lint and build from apps/api-client-ui
- [ ] T114 Run manual role acceptance checks from specs/015-user-access-control/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; MVP scope.
- **US2 (Phase 4)**: Depends on Foundational and uses the same scope infrastructure as US1.
- **US3 (Phase 5)**: Depends on Foundational; can run in parallel with US1/US2 after shared user repository work.
- **US4 (Phase 6)**: Depends on Foundational and tenant/user auth context.
- **US5 (Phase 7)**: Depends on Foundational and should be integrated carefully with US1/US2 visibility rules.
- **Polish (Phase 8)**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1 TenantUser personal records**: MVP and highest priority.
- **US2 Manager/Admin tenant-wide and personal views**: Can start after Foundational, but shares scope filtering with US1.
- **US3 Tenant Users tab**: Can start after Foundational and user repository updates.
- **US4 Admin tenant selection**: Can start after Foundational and auth context updates.
- **US5 Customer replaced by User in creation workflows**: Can start after Foundational, but final validation should happen after US1/US2 access rules are green.

### Parallel Opportunities

- Setup verification tasks T002-T004 can run in parallel.
- Foundational repository, Worker model, and UI type tasks can be split by app after T005-T007 fail.
- US1 test tasks T040-T043 can run in parallel before US1 implementation.
- US2 test tasks T056-T059 can run in parallel before US2 implementation.
- US3 route/use-case/UI tasks can split after T067-T069 fail.
- US4 API and UI tasks can split after T078-T079 fail.
- US5 API, Worker, and UI tests T086-T090 can run in parallel before implementation.
- Polish searches T107-T109 can run in parallel by app.

---

## Parallel Examples

### User Story 1

```bash
Task: "T040 Add failing TenantUser vehicle isolation integration tests in apps/appointment-api-service/tests/integration/vehicles.e2e.test.ts"
Task: "T041 Add failing TenantUser appointment list/detail isolation integration tests in apps/appointment-api-service/tests/integration/appointments-list.e2e.test.ts"
Task: "T043 Add failing TenantUser technician and service bay visibility integration tests in apps/appointment-api-service/tests/integration/tenant-user-resources.e2e.test.ts"
```

### User Story 3

```bash
Task: "T071 Add header-scoped GET /api/v1/users route in apps/appointment-api-service/src/infrastructure/http/routes/users.routes.ts"
Task: "T076 Add Users tab and tenant user table rendering in apps/api-client-ui/src/components/Dashboard.tsx"
Task: "T077 Update tenant user API calls to use /api/v1/users with x-tenant-id in apps/api-client-ui/src/api.ts"
```

### User Story 5

```bash
Task: "T091 Implement TenantUser automatic userId assignment in apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts"
Task: "T097 Consume UserId and persist it in Worker appointment processing in apps/appointment-worker-service/src/Core/Application/UseCases/AppointmentProcessor.cs"
Task: "T100 Load tenant users and show User selector for TenantManager/Admin in apps/api-client-ui/src/components/AppointmentModal.tsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 Setup.
2. Complete Phase 2 Foundational ownership and contract migration.
3. Complete Phase 3 User Story 1.
4. Stop and validate TenantUser privacy independently before adding elevated-role views.

### Incremental Delivery

1. Deliver US1 to close the privacy leak.
2. Deliver US2 to restore operational visibility for TenantManager/Admin.
3. Deliver US3 to expose tenant users in the dashboard.
4. Deliver US4 to force Admin tenant selection.
5. Deliver US5 to complete Customer retirement in creation workflows.

### Team Parallel Strategy

1. Pair on Phase 2 because schema, Worker, API, and UI contracts must agree.
2. After Phase 2, split by app or story: API access control, Worker message/persistence, and UI role tabs.
3. Rejoin at Phase 8 for cross-service verification and removal of leftover Customer references.

---

## Notes

- All TypeScript internal imports must use path aliases such as `@/domain/...`.
- Tests must fail before implementation according to the project constitution.
- Node API tests must be run by explicit file, not only by a broad npm script.
- Worker verification can use `dotnet test`.
- Keep tenant scoping from authenticated context and `x-tenant-id`; do not add tenant IDs into tenant-scoped query paths.
