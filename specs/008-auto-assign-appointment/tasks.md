# Tasks: Auto Assign Appointment

**Input**: Design documents from `/specs/008-auto-assign-appointment/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Review `specs/008-auto-assign-appointment/plan.md` and `AGENTS.md` context for Auto Assign feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Update `Appointment` domain entity to include `autoAssigned` flag in `apps/appointment-worker-service/src/Core/Domain/Entities/Appointment.cs`.
- [x] T003 [P] Update API command DTO `CreateAppointmentCommand` validation schema (Zod) to handle `autoAssigned` conditionally in `apps/appointment-api-service/src/application/commands/create-appointment.command.ts`.
- [x] T004 [P] Update Redis stream producer payload to pass `autoAssigned` boolean in `apps/appointment-api-service/src/infrastructure/http/routes/appointment.routes.ts`.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create appointment with auto-assign (Priority: P1) 🎯 MVP

**Goal**: Automatically assign the most suitable available technician and bay based on the service type skills required when `autoAssigned` is true.

**Independent Test**: Can be fully tested by submitting an appointment creation request with `autoAssigned: true` and verifying that the system assigns an appropriate technician and bay.

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

- [x] T005 [P] [US1] Write integration test for successful auto-assignment in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/Application/AppointmentAutoAssignTests.cs`.
- [x] T017 [P] [US1] Write integration test to cover concurrency issues during auto-assignment in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/Application/AppointmentAutoAssignConcurrencyTests.cs`.

### Implementation for User Story 1

- [x] T006 [P] [US1] Implement distributed lock checking logic (`RedisDistributedLock`) using `StackExchange.Redis` in `apps/appointment-worker-service/src/Infrastructure/Locking/RedisDistributedLock.cs`.
- [x] T007 [P] [US1] Implement skill-matching query to find a valid Technician for a `serviceTypeId` in `apps/appointment-worker-service/src/Infrastructure/Repositories/TechnicianRepository.cs`.
- [x] T008 [US1] Update `AppointmentProcessor` to execute the search for an available technician and bay, wrap it in a Redis lock, and assign the resources in `apps/appointment-worker-service/src/Core/Application/Processors/AppointmentProcessor.cs` (depends on T006, T007).

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Handle unavailable resources during auto-assign (Priority: P1)

**Goal**: Route appointments that cannot be auto-assigned due to lack of available resources to a Dead Letter Queue (DLQ).

**Independent Test**: Simulate a lack of available technicians or bays and verify the appointment request is routed to the DLQ instead of failing completely.

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [ ] T009 [P] [US2] Write integration test for DLQ routing on unfulfillable skill or unavailable resource in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/Application/AppointmentDLQTests.cs`.

### Implementation for User Story 2

- [ ] T010 [P] [US2] Implement DLQ message publisher logic in `apps/appointment-worker-service/src/Infrastructure/Messaging/DlqPublisher.cs`.
- [ ] T011 [US2] Update `AppointmentProcessor` to detect unavailable resources (null technician/bay) and invoke the DLQ publisher in `apps/appointment-worker-service/src/Core/Application/Processors/AppointmentProcessor.cs` (depends on T010).

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Create appointment manually (without auto-assign) (Priority: P2)

**Goal**: Manually specify the technician and service bay for an appointment by setting the auto-assign flag to false.

**Independent Test**: Submit a request with `autoAssigned: false` and ensure the system enforces the presence of manual allocation fields.

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [ ] T012 [P] [US3] Unit test for manual appointment validation (missing fields rejection) in `apps/appointment-api-service/tests/unit/application/commands/create-appointment.command.test.ts`.
- [x] T018 [P] [US3] Write integration test to cover concurrency issues during manual appointment creation in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/Application/AppointmentManualConcurrencyTests.cs`.

### Implementation for User Story 3

- [ ] T013 [US3] Ensure manual assignment validation error paths properly return HTTP 400 with strict missing-field errors in `apps/appointment-api-service/src/application/commands/create-appointment.command.ts`.
- [ ] T014 [US3] Update manual assignment logic in the worker to bypass the auto-assign search completely and use the provided IDs in `apps/appointment-worker-service/src/Core/Application/Processors/AppointmentProcessor.cs`.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T015 [P] Run all unit and integration tests for both the Node.js API and C# Worker to ensure zero regression.
- [ ] T016 [P] Execute end-to-end quickstart validation (`docker compose up`) as defined in `specs/008-auto-assign-appointment/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 logic inside `AppointmentProcessor`.
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independently testable.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Write integration test for successful auto-assignment" (T005)

# Launch all infrastructure parts for User Story 1 together:
Task: "Implement distributed lock checking logic" (T006)
Task: "Implement skill-matching query" (T007)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
