# Tasks: API Redis Cache

**Input**: Design documents from `/specs/007-api-redis-cache/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Define `ICacheProvider` interface in `apps/appointment-api-service/src/application/ports/cache-provider.interface.ts`
- [X] T002 Define `ICacheProvider` interface in `apps/appointment-worker-service/src/Core/Application/Ports/ICacheProvider.cs`
- [X] T003 Implement `RedisCacheProvider` in `apps/appointment-api-service/src/infrastructure/redis/redis-cache-provider.ts` using `ioredis`
- [X] T004 Implement `RedisCacheProvider` in `apps/appointment-worker-service/src/Infrastructure/Redis/RedisCacheProvider.cs` using `StackExchange.Redis`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T005 Inject `RedisCacheProvider` into API dependency injection container in `apps/appointment-api-service/src/main.ts`
- [X] T006 Inject `RedisCacheProvider` into Worker dependency injection container in `apps/appointment-worker-service/src/Program.cs`

**Checkpoint**: Foundation ready - Redis connection is established and injected in both services.

---

## Phase 3: User Story 1 - Unified Appointment Statuses (Priority: P1) 🎯 MVP

**Goal**: Ensure that all appointments strictly adhere to one of four unified statuses.

**Independent Test**: Can be tested independently by creating/updating appointments with valid statuses and verifying that invalid statuses are rejected.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US1] Write failing unit tests for appointment status validation in `appointment-api-service`.
- [X] T008 [P] [US1] Write failing unit tests for appointment status validation in `appointment-worker-service`.

### Implementation for User Story 1

- [X] T009 [P] [US1] Update `AppointmentStatus` type in `apps/appointment-api-service/src/domain/entities/appointment.entity.ts` to exactly `'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled'`
- [X] T010 [P] [US1] Update `AppointmentStatus` enum in `apps/appointment-worker-service/src/Core/Domain/Entities/Appointment.cs` to exactly `Scheduled`, `InProgress`, `Completed`, `Cancelled`
- [X] T011 [US1] Update validation schemas in `apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts` and related controllers to restrict status.
- [X] T012 [US1] Update FluentValidation rules in `apps/appointment-worker-service` to enforce the new `AppointmentStatus` enum.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - General Entity Read-Through Caching (Priority: P2)

**Goal**: Improve read performance for all general entities (e.g., customers, vehicles) by implementing a Redis read-through strategy using denormalized Redis Hashes with a TTL.

**Independent Test**: Read an entity, verify it is loaded from the database and saved to Redis with denormalized fields and TTL, and subsequently observing that follow-up reads hit Redis instead of the database. Updates and deletes should immediately impact the cache.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US2] Write failing integration tests for general entity read-through cache (caching, denormalization, updating, deleting) in `appointment-api-service`.

### Implementation for User Story 2

- [ ] T014 [US2] Create caching decorator/interceptor or wrapper in `apps/appointment-api-service/src/application/use-cases` for general read queries to implement read-through logic (cache miss -> fetch DB -> denormalize -> save Redis -> return).
- [x] T015 [US2] Update read endpoints for entities (Customer, Vehicle, etc.) in `appointment-api-service` to use the caching logic.
- [x] T016 [US2] Update update/delete endpoints in `appointment-api-service` to update or delete the Redis hash cache correspondingly.
- [x] T017 [US2] Ensure all general entity hashes include their fully denormalized representation as defined in the data model.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Read performance on general entities should be significantly improved.

---

## Phase 5: User Story 3 - Appointment-Specific TTL Caching (Priority: P3)

**Goal**: Apply specific caching rules and denormalization for appointments based on their status.

**Independent Test**: Test by creating appointments of varying statuses and verifying their caching behavior (TTL vs persistent) and ensuring denormalized relations (customer, vehicle, technician, bay) are present in the hash.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T018 [P] [US3] Write failing integration tests for appointment caching logic (TTL rules, denormalization) in `appointment-api-service`.
- [x] T019 [P] [US3] Write failing integration tests for appointment caching upon processing stream in `appointment-worker-service`.

### Implementation for User Story 3

- [x] T020 [US3] Update appointment read logic in `appointment-api-service` to apply read-through cache with conditional TTL (6 hours for 'Completed'/'Cancelled', no TTL for 'Scheduled'/'InProgress').
- [x] T021 [US3] Implement logic to fetch denormalized relations (Customer, Vehicle, Technician, ServiceBay) when caching an appointment in `appointment-api-service`.
- [x] T022 [US3] Update `appointment-worker-service` logic when persisting an appointment creation or status update to also write the denormalized appointment to Redis with the same conditional TTL logic.
- [x] T023 [US3] Update `appointment-api-service` appointment update/delete endpoints (if applicable) to maintain this cache logic.

**Checkpoint**: All user stories should now be independently functional.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T024 Update `README.md` or `quickstart.md` documentation if any new environment variables for Redis caching were added.
- [x] T025 Run `docker compose up -d` and manually verify quickstart scenarios.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (US1 → US2 → US3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2).
- **User Story 2 (P2)**: Can start after Foundational (Phase 2).
- **User Story 3 (P3)**: Depends on User Story 1 (status normalization) and User Story 2 (general caching patterns).
