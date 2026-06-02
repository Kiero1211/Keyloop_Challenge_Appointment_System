# Tasks: Tenant Appointment Fixes

**Input**: Design documents from `/specs/009-tenant-appointment-fixes/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL. We will rely on manual quickstart validation unless specified.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Run tests in `apps/appointment-api-service` to ensure current baseline is passing.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Generate database migrations to ensure any schema updates (like `lastActiveTenantId` or missing FKs) are synchronized.
- [x] T003 Delete the redundant CRUD use case in `apps/appointment-api-service/src/application/use-cases/crud/appointment/create-appointment.use-case.ts` and wire `apps/appointment-api-service/src/infrastructure/http/routes/appointment.routes.ts` to use the primary `CreateAppointmentUseCase`.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Role and Tenant Management (Priority: P1) 🎯 MVP

**Goal**: Manage users and their roles (Guest, TenantUser, TenantManager, Admin).

**Independent Test**: Register a user without tenant, assign them to a tenant via TenantManager, then promote them via Admin.

### Implementation for User Story 1

- [x] T004 [P] [US1] Create `AssignGuestUseCase` in `apps/appointment-api-service/src/application/use-cases/tenant/assign-guest.use-case.ts`
- [x] T005 [P] [US1] Create `PromoteUserUseCase` in `apps/appointment-api-service/src/application/use-cases/tenant/promote-user.use-case.ts`
- [x] T006 [US1] Implement role assignment and promotion endpoints in `apps/appointment-api-service/src/infrastructure/http/routes/tenant.routes.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Smooth Tenant Switching (Priority: P1)

**Goal**: Allow users to switch between tenants correctly.

**Independent Test**: Call the switch tenant endpoint and verify the session context and `lastActiveTenantId` is successfully updated.

### Implementation for User Story 2

- [x] T007 [US2] Update `apps/appointment-api-service/src/application/use-cases/auth/switch-tenant.use-case.ts` to update `lastActiveTenantId` in the `users` table via the user repository.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Appointment End Time Calculation (Priority: P2)

**Goal**: Automatically calculate appointment end time based on ServiceType duration.

**Independent Test**: Create an appointment and verify the end time is correctly populated in the stream payload.

### Implementation for User Story 3

- [x] T008 [US3] Update `apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts` to fetch `ServiceType` duration and calculate `scheduledEndTime` by adding it to `desiredStartTime`.
- [x] T009 [US3] Update `appointment_stream` consumers (if any in this repo) to save `scheduledEndTime` to DB.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Get Available Resources (Priority: P2)

**Goal**: Retrieve available Technicians and Service Bays for an arbitrary time frame.

**Independent Test**: Query the endpoint with a time range spanning multiple days and verify availability.

### Implementation for User Story 4

- [x] T009 [P] [US4] Implement availability queries (excluding overlapping appointments) in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-technician.repository.ts` and `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-service-bay.repository.ts`
- [x] T010 [P] [US4] Create `ListAvailableTechniciansUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/technician/list-available-technicians.use-case.ts` and `ListAvailableServiceBaysUseCase` in `apps/appointment-api-service/src/application/use-cases/crud/service-bay/list-available-service-bays.use-case.ts`
- [x] T011 [US4] Wire the GET availability endpoints in `apps/appointment-api-service/src/infrastructure/http/routes/technicians.routes.ts` and `apps/appointment-api-service/src/infrastructure/http/routes/service-bays.routes.ts`

---

## Phase 7: User Story 5 - Multi-Day Appointment Search (Priority: P2)

**Goal**: Search and retrieve a list of appointments over an arbitrary multi-day time frame.

**Independent Test**: Call the GET Appointment endpoint with a start date and end date spanning a week and verify appointments are returned.

### Implementation for User Story 5

- [x] T012 [P] [US5] Update the appointments query to support `startTime` and `endTime` in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-appointment-crud.repository.ts`
- [x] T013 [US5] Update the GET `/appointments` endpoint in `apps/appointment-api-service/src/infrastructure/http/routes/appointment.routes.ts` to accept the new query params.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T014 Fix `appointment_stream` prefixing to `tenant:${tenantId}:appointments_stream_${partition}` in `apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts`
- [x] T015 Run quickstart.md validation manually.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- Task T004 and T005 can be implemented in parallel.
- User Story 4 components (T009, T010) can be built in parallel.
- US1, US2, US3, US4, US5 can be worked on sequentially or concurrently once Phase 2 is complete.

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently
4. Add User Story 3 → Test independently
5. Add User Story 4 → Test independently
6. Add User Story 5 → Test independently
