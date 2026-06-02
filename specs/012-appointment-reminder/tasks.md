---

description: "Task list for Appointment Reminder feature implementation"
---

# Tasks: Appointment Reminder

**Input**: Design documents from `/specs/012-appointment-reminder/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Tests are INCLUDED per the strict TDD constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

## Path Conventions

- **Worker Service**: `apps/appointment-worker-service/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

*(No additional project setup needed as the worker service exists)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Create `AppointmentReminder` entity in `apps/appointment-worker-service/src/Core/Domain/Entities/AppointmentReminder.cs`
- [x] T002 Create `AppointmentReminderData` read-only view model in `apps/appointment-worker-service/src/Core/Domain/Entities/AppointmentReminderData.cs`
- [ ] T003 Configure EF Core mappings for new entities in `apps/appointment-worker-service/src/Infrastructure/Data/Configurations/`
- [x] T004 Create EF Core Migration for `AppointmentReminders` table and `AppointmentReminderView` in `apps/appointment-worker-service/src/Infrastructure/Data/Migrations/`
- [x] T005 [P] Create `IEmailService` port in `apps/appointment-worker-service/src/Core/Application/Ports/Services/IEmailService.cs`
- [x] T006 [P] Implement `MockEmailService` adapter in `apps/appointment-worker-service/src/Infrastructure/Adapters/Email/MockEmailService.cs`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Automatic Daily Appointment Reminders (Priority: P1) 🎯 MVP

**Goal**: As a dealership or service center system, I want to automatically send a reminder email to customers 2 days before their scheduled appointment.

**Independent Test**: Can be fully tested by scheduling an appointment 2 days in the future, running the daily reminder task, and verifying that the customer receives an email and the system records the reminder as sent.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [US1] Create Unit Tests for `SendAppointmentRemindersUseCase` in `apps/appointment-worker-service/tests/Unit/Application/UseCases/SendAppointmentRemindersUseCaseTests.cs`
- [x] T008 [US1] Create Integration Tests for `AppointmentReminderView` queries in `apps/appointment-worker-service/tests/Integration/Data/AppointmentReminderViewTests.cs`

### Implementation for User Story 1

- [x] T009 [US1] Implement `IAppointmentReminderRepository` port in `apps/appointment-worker-service/src/Core/Application/Ports/Repositories/IAppointmentReminderRepository.cs`
- [x] T010 [US1] Implement `AppointmentReminderRepository` in `apps/appointment-worker-service/src/Infrastructure/Data/Repositories/AppointmentReminderRepository.cs`
- [x] T011 [US1] Implement `SendAppointmentRemindersUseCase` in `apps/appointment-worker-service/src/Core/Application/UseCases/SendAppointmentRemindersUseCase.cs`
- [x] T012 [US1] Implement `DailyReminderBackgroundService` using `Task.Delay(TimeSpan.FromHours(24))` in `apps/appointment-worker-service/src/Infrastructure/BackgroundJobs/DailyReminderBackgroundService.cs`
- [x] T013 [US1] Register dependencies and BackgroundService in `apps/appointment-worker-service/src/Program.cs`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T014 Run quickstart.md validation
- [x] T015 Verify `dotnet test` passes with zero errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints/jobs
- Core implementation before integration

### Parallel Opportunities

- All tasks marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
2. Complete Phase 3: User Story 1
3. **STOP and VALIDATE**: Test User Story 1 independently
4. Deploy/demo if ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- Commit after each task or logical group
- **Test Execution**: For C# worker service, `dotnet test` is sufficient.
