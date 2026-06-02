# Tasks: API Caching and Small Fixes

**Input**: Design documents from `/specs/011-api-caching-fixes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Exact file paths are included in descriptions.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify project structure aligns with implementation plan

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Update `ICacheProvider` to include Set methods (`sadd`, `smembers`) in `apps/appointment-api-service/src/application/ports/cache-provider.port.ts`
- [x] T003 Implement Set methods in `RedisCacheAdapter` in `apps/appointment-api-service/src/infrastructure/cache/redis-cache.adapter.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Failed Appointments (Priority: P1) 🎯 MVP

**Goal**: Users need to be able to identify and view appointments that have failed processing or creation.

**Independent Test**: Can be tested by intentionally failing an appointment and verifying it appears in the failed appointments view.

### Implementation for User Story 1

- [x] T004 [P] [US1] Add `Failed` status to `AppointmentStatus` enum in `apps/appointment-worker-service/src/Core/Domain/Entities/AppointmentMessage.cs` (or `AppointmentStatus.cs`)
- [x] T005 [US1] Update `AppointmentProcessor` to catch exceptions, save the record with `Status = Failed`, and update the cache in `apps/appointment-worker-service/src/Core/Application/UseCases/AppointmentProcessor.cs`
- [x] T006 [P] [US1] Verify `status` query parameter works for fetching failed appointments in the GET list endpoint in `apps/appointment-api-service/src/infrastructure/http/routes/appointment.routes.ts` and `apps/appointment-api-service/src/application/use-cases/crud/appointment/list-appointments.use-case.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Fetch General Entities from Cache (Priority: P1)

**Goal**: When retrieving lists of general entities, serve response from cache (Set + Hashes) to reduce DB load.

**Independent Test**: Query a "get all" endpoint multiple times; verify DB is queried only the first time.

### Implementation for User Story 2

- [x] T007 [P] [US2] Implement cache checking and writing logic using Sets and Hashes in `apps/appointment-api-service/src/application/use-cases/crud/technician/list-technicians.use-case.ts` (and other related GET list use cases for general entities)
- [x] T008 [US2] Apply the caching logic to `list-customers.use-case.ts`, `list-service-bays.use-case.ts`, `list-service-types.use-case.ts`, and `list-vehicles.use-case.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Automatic Database Initialization on Startup (Priority: P2)

**Goal**: API service should automatically ensure the database schema and seed data are initialized on startup.

**Independent Test**: Start the API service against an empty database; verify tables are created and seed data is populated.

### Implementation for User Story 3

- [x] T009 [P] [US3] Update `apps/appointment-api-service/src/main.ts` (or appropriate initialization file) to automatically execute the database initialization and seed tasks on startup if `INIT_DB_ON_STARTUP=true`.

**Checkpoint**: All P1 and P2 user stories should now be independently functional

---

## Phase 6: User Story 4 - OpenAPI Specification Consistency (Priority: P3)

**Goal**: OpenAPI spec must match actual request/response models used in the API code.

**Independent Test**: Manually compare code models against OpenAPI definition.

### Implementation for User Story 4

- [x] T010 [P] [US4] Update `openapi.yaml` to include `autoAssigned`, `technicianHolId`, `serviceBayHoldId`, make `technicianId` and `serviceBayId` optional in `AppointmentCreateRequest`, and add `Failed` to `AppointmentResponse` status.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T011 Run all unit, integration, and e2e tests in `apps/appointment-api-service`
- [x] T012 Run all tests in `apps/appointment-worker-service` using `dotnet test`
- [x] T013 Verify multi-tenancy rules are strictly adhered to in all updated endpoints and use cases

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent
- **User Story 2 (P1)**: Independent
- **User Story 3 (P2)**: Independent
- **User Story 4 (P3)**: Independent

### Parallel Opportunities

- T004, T006, T007, T010 can be executed in parallel after Foundational tasks (T002, T003) are complete.

## Implementation Strategy

### MVP First
1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (User Story 1) and test independently.

### Incremental Delivery
1. Foundation ready.
2. Add US1 → Test → Demo.
3. Add US2 → Test → Demo.
4. Add US3 → Test.
5. Add US4 → Validate.
