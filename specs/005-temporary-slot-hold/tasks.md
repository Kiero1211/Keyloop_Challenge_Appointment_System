# Tasks: Temporary Slot Hold

**Input**: Design documents from `/specs/005-temporary-slot-hold/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup & Foundational

**Purpose**: Preparing foundational pieces, specifically caching primitives required for holds.

- [x] T001 [P] Add `setMultipleIfNotExists` and `deleteMultiple` to CacheProvider port in `apps/appointment-api-service/src/application/ports/cache.provider.ts`
- [x] T002 [P] Implement `setMultipleIfNotExists` (with TTL) and `deleteMultiple` using a Lua script or transaction in `apps/appointment-api-service/src/infrastructure/cache/redis-cache.provider.ts`

---

## Phase 2: User Story 1 - Initiate Booking Hold (Priority: P1) 🎯 MVP

**Goal**: User creates a 5-minute hold on a specific technician and service bay to block concurrent bookings.

**Independent Test**: Can be fully tested by initiating a hold and then attempting a secondary hold for the exact same technician or bay.

### Tests for User Story 1 ⚠️
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [P] [US1] Integration test for `POST /api/v1/appointments/hold` in `apps/appointment-api-service/tests/integration/appointment.e2e.test.ts`

### Implementation for User Story 1

- [x] T004 [P] [US1] Create `TemporaryHold` entity and input DTO in `apps/appointment-api-service/src/domain/entities/temporary-hold.ts`
- [x] T005 [P] [US1] Implement `CreateHoldUseCase` in `apps/appointment-api-service/src/application/use-cases/create-hold.use-case.ts`
- [x] T006 [US1] Add `POST /hold` route and Zod validation in `apps/appointment-api-service/src/infrastructure/http/routes/appointments-crud.routes.ts`

---

## Phase 3: User Story 2 - Confirm Booking (Priority: P1)

**Goal**: Confirm the booking by providing the hold context. Also removes the previous vehicle idempotency check so multiple appointments can be booked for the same vehicle.

**Independent Test**: Initiate a hold, then confirm it. The hold should be consumed, and the appointment created. A subsequent attempt should fail.

### Tests for User Story 2 ⚠️

- [x] T007 [P] [US2] Integration test: Successfully confirm booking with valid hold in `apps/appointment-api-service/tests/integration/appointment.e2e.test.ts`
- [x] T008 [P] [US2] Integration test: Reject booking (`409 Conflict`) if hold is missing, expired, or doesn't match the requested technician/bay in `apps/appointment-api-service/tests/integration/appointment.e2e.test.ts`
- [x] T009 [P] [US2] Integration test: Allow booking same vehicle twice without idempotency conflict in `apps/appointment-api-service/tests/integration/appointment.e2e.test.ts`

### Implementation for User Story 2

- [x] T010 [P] [US2] Update `CreateAppointmentUseCase` to validate the hold using the CacheProvider in `apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts`
- [x] T011 [US2] Remove the vehicle idempotency cache check in `CreateAppointmentUseCase` in `apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts`
- [x] T012 [US2] Delete the hold keys via CacheProvider after successfully pushing the stream message in `apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts`
- [x] T013 [US2] Ensure a specific error message ("The booking session has expired. Please re-create the booking session.") is thrown for missing/expired holds.

---

## Phase 4: User Story 3 - Hold Expiration (Priority: P2)

**Goal**: Holds automatically expire exactly 5 minutes after creation.

**Independent Test**: Create a hold, advance time/wait 5 minutes, verify slot is freed.

### Tests for User Story 3 ⚠️

- [x] T014 [US3] Integration test: Ensure hold expires after TTL and allows new holds in `apps/appointment-api-service/tests/integration/appointment.e2e.test.ts`

### Implementation for User Story 3

- [x] T015 [US3] Verify `setMultipleIfNotExists` properly enforces the 300-second TTL natively in Redis (if not fully implemented in T002).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, formatting, and final verifications.

- [x] T016 Run linting (`npm run lint` or `eslint`) on the `apps/appointment-api-service` project.
- [x] T017 Verify Swagger/OpenAPI documentation
- [x] T018 Update `openapi.yaml` to include new `POST /hold` endpoint.
- [x] T019 Run `quickstart.md` manual validation against the live docker-compose stack.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Must be completed first to provide caching primitives.
- **User Story 1**: Depends on Setup.
- **User Story 2**: Depends on User Story 1 (needs the hold endpoint to exist to be testable end-to-end).
- **User Story 3**: Depends on User Story 1.

### Parallel Opportunities

- Tests (T003, T007, T008, T009) can be scaffolded in parallel before the implementation begins.
- T004 (Entity) and T001/T002 (CacheProvider) can be implemented simultaneously.
