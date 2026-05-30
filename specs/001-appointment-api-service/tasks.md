# Tasks: Appointment API Service — Ingestion Layer

**Input**: Design documents from `/specs/001-appointment-api-service/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure, `package.json`, `tsconfig.json`, and `.env.example` in `apps/appointment-api-service/`
- [X] T002 Initialize `apps/appointment-api-service/` with `express`, `ioredis`, `zod`, `uuid`, and TypeScript testing dependencies
- [X] T003 [P] Configure Jest for unit and integration tests in `apps/appointment-api-service/jest.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T004 Create `AsyncLocalStorage` store in `apps/appointment-api-service/src/domain/context/tenant-context.ts`
- [X] T005 [P] Create domain exceptions (`DomainValidationException`, `DuplicateAppointmentException`, `CacheUnavailableException`, `StreamPublishException`) in `apps/appointment-api-service/src/domain/exceptions/`
- [X] T006 Create Value Objects with invariant guards in `apps/appointment-api-service/src/domain/value-objects/`
- [X] T007 [P] Define Port interfaces (`ICacheProvider`, `IMessagePublisher`) in `apps/appointment-api-service/src/application/ports/`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Submit an Appointment Request (Priority: P1) 🎯 MVP

**Goal**: Accept valid appointment payload, generate commandId, queue booking command to Redis Stream, and handle missing fields (HTTP 400).

**Independent Test**: Send `POST /api/v1/appointments` with valid payload -> 202 response. Missing fields -> 400 response. (Cache duplicate guard and proper partitioning are fully verified in subsequent stories).

### Tests for User Story 1 ⚠️

- [X] T008 [P] [US1] Write unit tests for `CreateAppointmentUseCase` and `HealthCheckUseCase` in `apps/appointment-api-service/tests/unit/application/`
- [X] T009 [P] [US1] Write unit tests for Value Object boundaries in `apps/appointment-api-service/tests/unit/domain/value-objects/desired-time.test.ts`
- [X] T010 [P] [US1] Write integration test for `RedisStreamPublisher` in `apps/appointment-api-service/tests/integration/redis-stream.publisher.test.ts`
- [X] T011 [P] [US1] Write E2E integration test for POST/GET endpoints in `apps/appointment-api-service/tests/integration/appointment.e2e.test.ts`

### Implementation for User Story 1

- [X] T012 [P] [US1] Create Zod schema in `apps/appointment-api-service/src/application/commands/create-appointment.command.ts`
- [X] T013 [US1] Implement `CreateAppointmentUseCase` and `HealthCheckUseCase` in `apps/appointment-api-service/src/application/use-cases/`
- [X] T014 [US1] Implement `RedisStreamPublisher` via `ioredis` in `apps/appointment-api-service/src/infrastructure/messaging/redis-stream.publisher.ts`
- [X] T015 [US1] Implement `TenantContextMiddleware` and `ErrorHandlerMiddleware` in `apps/appointment-api-service/src/infrastructure/http/middleware/`
- [X] T016 [US1] Implement Express routes and controllers in `apps/appointment-api-service/src/infrastructure/http/routes/`
- [X] T017 [US1] Implement `server.ts` and `cluster.ts` in `apps/appointment-api-service/src/infrastructure/http/`
- [X] T018 [US1] Implement DI `container.ts` linking components in `apps/appointment-api-service/src/infrastructure/di/container.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional (can receive payload and publish to stream).

---

## Phase 4: User Story 2 — Deterministic Stream Partition Selection (Priority: P2)

**Goal**: Route commands consistently to the correct partition based on `f(tenant_id, vehicle_id)`.

**Independent Test**: Hash function deterministically outputs uniform [0, 3] distribution. Request partition field accurately reflects the output.

### Tests for User Story 2 ⚠️

- [X] T019 [P] [US2] Write unit tests for deterministic partition distribution (1000 items <= 30%) in `apps/appointment-api-service/tests/unit/domain/partition-hasher.test.ts`

### Implementation for User Story 2

- [X] T020 [US2] Implement FNV-1a 32-bit hasher in `apps/appointment-api-service/src/domain/utils/partition-hasher.ts`
- [X] T021 [US2] Integrate hasher into `CreateAppointmentUseCase` mapping logic

**Checkpoint**: User Story 2 adds deterministic scaling support.

---

## Phase 5: User Story 3 — Idempotency Protection via Appointment Hash (Priority: P3)

**Goal**: Prevent duplicate submissions for the same vehicle in cache. Return 409 Conflict if hash exists.

**Independent Test**: Resubmitting the same `tenant_id` + `vehicle_id` within the test yields a `409 Conflict`.

### Tests for User Story 3 ⚠️

- [X] T022 [P] [US3] Write integration test for cache adapter in `apps/appointment-api-service/tests/integration/redis-cache.adapter.test.ts`

### Implementation for User Story 3

- [X] T023 [US3] Implement `RedisCacheAdapter` (exists, hset, del, ping) in `apps/appointment-api-service/src/infrastructure/cache/redis-cache.adapter.ts`
- [X] T024 [US3] Update DI container to wire the real `RedisCacheAdapter` instead of a stub.

**Checkpoint**: User Story 3 adds idempotency protection to the ingestion API.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T025 [P] Implement multi-stage `Dockerfile` in `apps/appointment-api-service/Dockerfile`
- [X] T026 Update root `docker-compose.yml` to include `appointment-api-service`
- [X] T027 Code cleanup and refactoring
- [X] T028 Run `npm run lint` and ensure 0 errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Proceed sequentially in priority order (US1 → US2 → US3) or parallelized across developers where applicable
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2). Can use a mock hash/cache until US2/US3 complete.
- **User Story 2 (P2)**: Independent of US1; tests purely the hashing algorithm.
- **User Story 3 (P3)**: Independent of US1; tests the `ioredis` cache integration natively.

### Parallel Opportunities

- Foundational tasks (T005, T007) can run in parallel.
- All testing tasks in User Stories (T008, T009, T010, T011, T019, T022) can be drafted immediately in parallel.
- US2 (Hash function) and US3 (Redis Cache adapter) can be built completely in parallel with US1 (API logic).

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → API can ingest data, map via mock logic, and send to the stream (MVP)
3. Add User Story 2 → Adds stable partitioning to MVP
4. Add User Story 3 → Adds idempotency protection to MVP
5. Execute Phase 6 → Full system containerized
