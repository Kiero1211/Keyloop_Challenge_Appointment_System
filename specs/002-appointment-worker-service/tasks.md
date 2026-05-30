# Tasks: appointment-worker-service

**Input**: Design documents from `/specs/002-appointment-worker-service/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are generated for standard coverage in the Polish phase, and TDD steps can be inferred per the Constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize C# .NET 8 Worker project in `apps/appointment-worker-service/`
- [x] T002 Configure Hexagonal architecture folders (`src/Core/Domain`, `src/Core/Application`, `src/Infrastructure`)
- [x] T003 [P] Add multi-stage `Dockerfile` to `apps/appointment-worker-service/Dockerfile`
- [x] T004 [P] Update root `docker-compose.yml` to include the new `appointment-worker-service`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add core NuGet packages to project (`Microsoft.Extensions.Hosting`, `StackExchange.Redis`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `FluentValidation`)
- [x] T006 Setup EF Core `AppDbContext` in `src/Infrastructure/Data/AppDbContext.cs` including `tenant_id` Global Query Filter
- [x] T007 Configure Redis connection multiplexer in `src/Infrastructure/Redis/RedisConnectionProvider.cs`
- [x] T008 Define foundational Ports in `src/Core/Application/Ports/` (`IAppointmentRepository`, `ICacheProvider`)
- [x] T009 Setup standard asynchronous scope and DI wiring in `src/Program.cs`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Process New Appointment Bookings (Priority: P1) 🎯 MVP

**Goal**: System automatically processes new appointment requests from the queue in real-time, validates them, and persists confirmed status.

**Independent Test**: Submit a booking request to the stream and verify it gets picked up, processed, and saved to PostgreSQL.

### Implementation for User Story 1

- [x] T010 [P] [US1] Create Domain Entities (`TrackingRecord`, `AppointmentMessage` ValueObject) in `src/Core/Domain/Entities/`
- [x] T011 [P] [US1] Define `IAppointmentProcessor` in `src/Core/Application/Ports/`
- [x] T012 [US1] Implement `AppointmentRepository` in `src/Infrastructure/Data/AppointmentRepository.cs`
- [x] T013 [US1] Implement `AppointmentProcessor` in `src/Core/Application/UseCases/AppointmentProcessor.cs` (basic save to DB)
- [x] T014 [US1] Implement `RedisStreamConsumerService` (BackgroundService) in `src/Infrastructure/Workers/RedisStreamConsumerService.cs` to read from stream and call processor

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Prevent Double Booking of Resources (Priority: P1)

**Goal**: System ensures no two appointments can claim the same service bay and technician simultaneously.

**Independent Test**: Submit two concurrent booking requests for the exact same time, bay, and technician. Only one confirms.

### Implementation for User Story 2

- [x] T015 [P] [US2] Update EF Core configuration in `AppDbContext` to use `xmin` (RowVersion) for optimistic concurrency control on `TrackingRecord`
- [x] T016 [US2] Enhance `AppointmentProcessor` to handle `DbUpdateConcurrencyException` and correctly mark conflicting bookings as Rejected
- [x] T017 [US2] Ensure status is correctly pushed back to Redis cache using `ICacheProvider` upon conflict resolution

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Validate Resource Availability (Priority: P2)

**Goal**: System verifies that the required service bay and a qualified technician are entirely free before confirming.

**Independent Test**: Request an appointment during a time when either the bay or the technician is unavailable; ensure it is rejected.

### Implementation for User Story 3

- [x] T018 [P] [US3] Define `IBayAvailabilityService` Port in `src/Core/Application/Ports/`
- [x] T019 [US3] Implement `HttpBayAvailabilityService` Adapter in `src/Infrastructure/Http/HttpBayAvailabilityService.cs`
- [x] T020 [US3] Integrate `IBayAvailabilityService` into `AppointmentProcessor` to validate resources before saving to DB
- [x] T021 [US3] Implement Dead-Letter Queue (DLQ) fallback in `RedisStreamConsumerService` to route failed messages on HTTP timeouts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T022 [P] Write unit tests for `AppointmentProcessor` in `tests/UnitTests/AppointmentProcessorTests.cs`
- [x] T023 [P] Write integration tests using Testcontainers for `RedisStreamConsumerService` in `tests/IntegrationTests/RedisStreamConsumerServiceTests.cs`
- [x] T024 Validate and lock down architectural layer boundaries (ensure no infra imports in Domain)
- [x] T025 Run EF Core migrations to generate initial database schema

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Proceed sequentially in priority order (P1 → P2 → P3) or in parallel if developers are available.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- Dockerfile and structural tasks can be executed while core logic is being stubbed.
- Domain Entity definition (T010) and Port definition (T011) can be done in parallel before wiring up the concrete `AppointmentProcessor`.
- Bay Service HTTP client (T019) can be developed in parallel to EF Core concurrency integration (T015/T016).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Ensure the worker reads a stream message and persists it properly.

### Incremental Delivery

1. Follow MVP first to verify the queue-to-db pipeline.
2. Complete Phase 4 to guarantee correctness under concurrent load.
3. Complete Phase 5 to satisfy full external constraint validation.
4. Run integration tests and finalize Docker compose orchestration.
