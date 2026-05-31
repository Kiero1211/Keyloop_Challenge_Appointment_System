# Tasks: Worker Availability Engine & Tenant Bulkheading (004-worker-core-logic)

**Feature**: Worker Core Logic | **Branch**: `004-worker-core-logic`
**Plan**: [plan.md](file:///Users/kiero/Desktop/Code/Keyloop/specs/004-worker-core-logic/plan.md) | **Spec**: [spec.md](file:///Users/kiero/Desktop/Code/Keyloop/specs/004-worker-core-logic/spec.md)

> **TDD required** — The spec and plan mandate test-first. All unit and integration test tasks MUST be completed and verified to FAIL before the corresponding implementation tasks are started.

---

## Phase 1: Setup (Project Scaffolding)

**Purpose**: Initialize test projects, solution file, and remove the retired HTTP adapter.

- [ ] T001 Create solution file `apps/appointment-worker-service/AppointmentWorkerService.sln` linking `src/` and both `tests/` projects
- [ ] T002 [P] Scaffold xUnit + Moq test project `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/AppointmentWorkerService.Tests.Unit.csproj` with project reference to `src/`
- [ ] T003 [P] Scaffold xUnit + Testcontainers.PostgreSql test project `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/AppointmentWorkerService.Tests.Integration.csproj` with project reference to `src/`
- [ ] T004 Delete `apps/appointment-worker-service/src/Infrastructure/Http/HttpBayAvailabilityService.cs` and remove its DI registration from `apps/appointment-worker-service/src/Program.cs`
- [ ] T005 Delete `apps/appointment-worker-service/src/Core/Application/Ports/IBayAvailabilityService.cs`

**Checkpoint**: Solution builds cleanly with zero errors after removing the HTTP adapter.

---

## Phase 2: Foundational (Domain Layer + Ports — blocks all stories)

**Purpose**: Define all domain entities, exceptions, and port interfaces. No implementation code yet — these are the seams that tests will mock against.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Domain Entities & Exceptions

- [ ] T006 [P] Extend `AppointmentStatus` enum in `apps/appointment-worker-service/src/Core/Domain/Entities/TrackingRecord.cs` with `Scheduled`, `InProgress`, `Cancelled`, `Completed` values
- [ ] T007 [P] Create read-only domain entity `apps/appointment-worker-service/src/Core/Domain/Entities/Technician.cs` (`Id`, `TenantId`, `Name`, implements `IMustHaveTenant`)
- [ ] T008 [P] Create read-only domain entity `apps/appointment-worker-service/src/Core/Domain/Entities/ServiceBay.cs` (`Id`, `TenantId`, `Name`, implements `IMustHaveTenant`)
- [ ] T009 [P] Create read-only domain entity `apps/appointment-worker-service/src/Core/Domain/Entities/TechnicianSkill.cs` (`TechnicianId`, `ServiceTypeId`, `TenantId` — composite key, implements `IMustHaveTenant`)
- [ ] T010 [P] Create `apps/appointment-worker-service/src/Core/Domain/Exceptions/ResourceCurrentlyOccupiedException.cs` (code: `RESOURCE_CURRENTLY_OCCUPIED`)
- [ ] T011 [P] Create `apps/appointment-worker-service/src/Core/Domain/Exceptions/InvalidBookingRequestException.cs` (code: `INVALID_BOOKING_REQUEST`)

### Repository Ports

- [ ] T012 Reorganize `apps/appointment-worker-service/src/Core/Application/Ports/` — move existing ports into `Ports/Repositories/` subdirectory and update all `using` references
- [ ] T013 [P] Extend `apps/appointment-worker-service/src/Core/Application/Ports/Repositories/IAppointmentRepository.cs` with `HasTechnicianOverlapAsync(string technicianId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct)` and `HasBayOverlapAsync(string serviceBayId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct)`
- [ ] T014 [P] Create `apps/appointment-worker-service/src/Core/Application/Ports/Repositories/ITechnicianRepository.cs` with `ExistsAsync(string technicianId, CancellationToken ct)`
- [ ] T015 [P] Create `apps/appointment-worker-service/src/Core/Application/Ports/Repositories/IServiceBayRepository.cs` with `ExistsAsync(string serviceBayId, CancellationToken ct)`
- [ ] T016 [P] Create `apps/appointment-worker-service/src/Core/Application/Ports/Repositories/ITechnicianSkillRepository.cs` with `HasSkillAsync(string technicianId, string serviceTypeId, CancellationToken ct)`

### Service Ports & Validator

- [ ] T017 [P] Create `apps/appointment-worker-service/src/Core/Application/Ports/Services/ITechnicianService.cs` with `ValidateAndCheckAvailabilityAsync(string technicianId, string serviceTypeId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct)`
- [ ] T018 [P] Create `apps/appointment-worker-service/src/Core/Application/Ports/Services/IBayService.cs` with `ValidateAndCheckAvailabilityAsync(string serviceBayId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct)`
- [ ] T019 Create `apps/appointment-worker-service/src/Core/Application/Validators/AppointmentMessageValidator.cs` (FluentValidation — required fields: `TenantId`, `TechnicianId`, `ServiceBayId`, `ServiceTypeId`, `VehicleId`, `CustomerId`, `DesiredStartTime`)

**Checkpoint**: `dotnet build` passes. All port interfaces and domain types compile. Zero test runs yet.

---

## Phase 3: User Story 1 — Booking Rejected When Resource Is Occupied (Priority: P1) 🎯 MVP

**Goal**: Deliver the core availability invariant — the processor rejects bookings with active conflicts (`Scheduled`/`InProgress`) and accepts those overlapping only `Cancelled`/`Completed` records.

**Independent Test**: `dotnet test tests/AppointmentWorkerService.Tests.Unit/ --filter "Availability"` and `dotnet test tests/AppointmentWorkerService.Tests.Integration/ --filter "Overlap"` all pass green.

### RED: Unit Tests for Validator (write first — must fail)

- [ ] T020 [P] [US1] Write failing unit tests in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/Application/AppointmentMessageValidatorTests.cs`:
  - `GivenNullTechnicianId_ThenValidationFails`
  - `GivenNullServiceBayId_ThenValidationFails`
  - `GivenAllFieldsPresent_ThenValidationPasses`

### RED: Unit Tests for TechnicianService (write first — must fail)

- [ ] T021 [P] [US1] Write failing unit tests in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/Application/TechnicianServiceTests.cs`:
  - `GivenTechnicianNotFound_ThenThrowsInvalidBookingRequest`
  - `GivenTechnicianLacksSkill_ThenThrowsInvalidBookingRequest`
  - `GivenTechnicianHasActiveOverlap_ThenThrowsResourceCurrentlyOccupied`
  - `GivenTechnicianAvailable_ThenCompletesWithoutException`

### RED: Unit Tests for BayService (write first — must fail)

- [ ] T022 [P] [US1] Write failing unit tests in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/Application/BayServiceTests.cs`:
  - `GivenBayNotFound_ThenThrowsInvalidBookingRequest`
  - `GivenBayHasActiveOverlap_ThenThrowsResourceCurrentlyOccupied`
  - `GivenBayAvailable_ThenCompletesWithoutException`

### RED: Unit Tests for AppointmentProcessor (write first — must fail)

- [ ] T023 [US1] Write failing unit tests in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/Application/AppointmentProcessorAvailabilityTests.cs`:
  - `GivenMissingTechnicianId_WhenProcessAsync_ThenThrowsInvalidBookingRequest`
  - `GivenMissingServiceBayId_WhenProcessAsync_ThenThrowsInvalidBookingRequest`
  - `GivenTechnicianServiceThrowsInvalidRequest_WhenProcessAsync_ThenPropagates`
  - `GivenTechnicianServiceThrowsResourceOccupied_WhenProcessAsync_ThenPropagates`
  - `GivenBayServiceThrowsResourceOccupied_WhenProcessAsync_ThenPropagates`
  - `GivenBothServicesOk_WhenProcessAsync_ThenPersistsConfirmedRecord`
  - `GivenBothServicesOk_WhenProcessAsync_ThenAcknowledgesStreamMessage`

### RED: Integration Tests for Repositories (write first — must fail)

- [ ] T024 [P] [US1] Write failing integration tests in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/Data/AppointmentRepositoryOverlapTests.cs`:
  - `GivenInProgressRecord_WhenCheckTechnicianOverlap_ThenReturnsTrue`
  - `GivenScheduledRecord_WhenCheckTechnicianOverlap_ThenReturnsTrue`
  - `GivenCancelledRecord_WhenCheckTechnicianOverlap_ThenReturnsFalse`
  - `GivenCompletedRecord_WhenCheckTechnicianOverlap_ThenReturnsFalse`
  - `GivenDifferentTenant_WhenCheckTechnicianOverlap_ThenReturnsFalse`
  - `GivenAdjacentSlot_WhenCheckTechnicianOverlap_ThenReturnsFalse`
  - `GivenExactMatchSlot_WhenCheckBayOverlap_ThenReturnsTrue`
- [ ] T025 [P] [US1] Write failing integration tests in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/Data/TechnicianRepositoryTests.cs`, `ServiceBayRepositoryTests.cs`, `TechnicianSkillRepositoryTests.cs` (existence and skill checks against real Postgres)

**Verify RED**: `dotnet test AppointmentWorkerService.sln` — all new tests must FAIL at this point.

### GREEN: Infrastructure — DbContext + Repository Implementations

- [ ] T026 [US1] Modify `apps/appointment-worker-service/src/Infrastructure/Data/AppDbContext.cs`:
  - Add `DbSet<Technician>`, `DbSet<ServiceBay>`, `DbSet<TechnicianSkill>`
  - Configure `StartTime`/`EndTime` on `TrackingRecord` as `timestamptz` in `OnModelCreating`
  - Ensure `EnableLegacyTimestampBehavior` is NOT set in Npgsql options
- [ ] T027 [US1] Implement overlap queries in `apps/appointment-worker-service/src/Infrastructure/Data/AppointmentRepository.cs` — add `HasTechnicianOverlapAsync` and `HasBayOverlapAsync` using half-open interval: `r.StartTime < endUtc && r.EndTime > startUtc` filtered by `Scheduled`/`InProgress` status
- [ ] T028 [P] [US1] Create `apps/appointment-worker-service/src/Infrastructure/Data/TechnicianRepository.cs` implementing `ITechnicianRepository.ExistsAsync`
- [ ] T029 [P] [US1] Create `apps/appointment-worker-service/src/Infrastructure/Data/ServiceBayRepository.cs` implementing `IServiceBayRepository.ExistsAsync`
- [ ] T030 [P] [US1] Create `apps/appointment-worker-service/src/Infrastructure/Data/TechnicianSkillRepository.cs` implementing `ITechnicianSkillRepository.HasSkillAsync`

### GREEN: Application Services

- [ ] T031 [US1] Create `apps/appointment-worker-service/src/Core/Application/Services/TechnicianService.cs` implementing `ITechnicianService`:
  1. `ITechnicianRepository.ExistsAsync` → `InvalidBookingRequestException` if false
  2. `ITechnicianSkillRepository.HasSkillAsync` → `InvalidBookingRequestException` if false
  3. `IAppointmentRepository.HasTechnicianOverlapAsync` → `ResourceCurrentlyOccupiedException` if true
- [ ] T032 [US1] Create `apps/appointment-worker-service/src/Core/Application/Services/BayService.cs` implementing `IBayService`:
  1. `IServiceBayRepository.ExistsAsync` → `InvalidBookingRequestException` if false
  2. `IAppointmentRepository.HasBayOverlapAsync` → `ResourceCurrentlyOccupiedException` if true

### GREEN: AppointmentProcessor Refactor

- [ ] T033 [US1] Modify `apps/appointment-worker-service/src/Core/Application/UseCases/AppointmentProcessor.cs`:
  - Remove `IBayAvailabilityService` dependency
  - Inject `ITechnicianService`, `IBayService`, `IValidator<AppointmentMessage>`
  - New sequence: validate → UTC convert → tech check → bay check → persist (UTC times) → cache → ACK

### GREEN: DI Registration

- [ ] T034 [US1] Update `apps/appointment-worker-service/src/Program.cs`:
  - Remove `IBayAvailabilityService` / `HttpClient` registration
  - Register: `ITechnicianRepository → TechnicianRepository`, `IServiceBayRepository → ServiceBayRepository`, `ITechnicianSkillRepository → TechnicianSkillRepository`, `ITechnicianService → TechnicianService`, `IBayService → BayService`
  - Add `services.AddValidatorsFromAssemblyContaining<AppointmentMessageValidator>()`
  - Fix `ScopedTenantService` to propagate actual `TenantId` from the message being processed (set via `AsyncLocal<string>` or scoped setter)

**Verify GREEN**: `dotnet test AppointmentWorkerService.sln` — all Phase 3 tests pass.

**Checkpoint**: User Story 1 fully functional. Can book appointments; rejects conflicts and invalid requests.

---

## Phase 4: User Story 2 — Whale Tenant Cannot Starve Smaller Tenants (Priority: P2)

**Goal**: Deliver the tenant bulkhead — a per-tenant concurrency cap that allows smaller tenants to be processed immediately even when a whale tenant floods the stream.

**Independent Test**: `dotnet test tests/AppointmentWorkerService.Tests.Unit/ --filter "Bulkhead"` passes and `tenant_B` completes within 500 ms.

### RED: Unit Tests for Bulkhead (write first — must fail)

- [ ] T035 [US2] Write failing unit tests in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/Infrastructure/TenantBulkheadRouterTests.cs`:
  - `GivenFiftyTenantA_AndOneTenantB_WhenDispatched_ThenTenantBCompletesWithin500ms`
  - `GivenChannelFull_WhenDispatch_ThenReturnsChannelFullResult`
  - `GivenChannelFull_WhenDispatch_ThenDoesNotBlockCaller`

**Verify RED**: New bulkhead tests FAIL.

### GREEN: Bulkhead Implementation

- [ ] T036 [US2] Create `apps/appointment-worker-service/src/Infrastructure/Bulkhead/TenantBulkheadRouter.cs`:
  - `ConcurrentDictionary<string, (BoundedChannel<Func<Task>>, SemaphoreSlim)>` keyed by `tenantId`
  - `DispatchAsync(tenantId, handler)` → try write to bounded channel → return `DispatchResult.Dispatched` or `DispatchResult.ChannelFull` immediately (non-blocking)
  - Background drain task per tenant respects `SemaphoreSlim` (configurable max concurrent, default 5)
- [ ] T037 [US2] Modify `apps/appointment-worker-service/src/Infrastructure/Workers/RedisStreamConsumerService.cs` — after deserializing message, call `_bulkheadRouter.DispatchAsync(message.TenantId, handler)`. If result is `ChannelFull` → do NOT call `StreamAcknowledgeAsync` → `continue` to read next message
- [ ] T038 [US2] Update `apps/appointment-worker-service/src/Program.cs` — register `TenantBulkheadRouter` as singleton; bind `WorkerOptions` from config env vars `WORKER_BULKHEAD_MAX_CONCURRENT` (default: 5) and `WORKER_BULKHEAD_QUEUE_CAPACITY` (default: 50)

**Verify GREEN**: `dotnet test tests/AppointmentWorkerService.Tests.Unit/ --filter "Bulkhead"` — all pass.

**Checkpoint**: Noisy-neighbour protection active. Smaller tenants process immediately regardless of whale queue depth.

---

## Phase 5: User Story 3 — Correct Timeslot Overlap Detection (Priority: P2)

**Goal**: Explicit parametric tests proving half-open interval semantics (`[A,B)` and `[C,D)` conflict iff `A < D AND C < B`) covering all boundary cases — adjacent, contained, and exact-match slots.

**Independent Test**: `dotnet test tests/AppointmentWorkerService.Tests.Integration/ --filter "Overlap"` — all boundary scenarios pass.

> **Note**: The production overlap logic is already implemented in T027 (required by US1). This phase adds the boundary-condition test coverage to make the semantics verifiable and prevents regressions.

### Tests (write — these verify the implementation from T027)

- [ ] T039 [US3] Add parametric boundary tests to `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/Data/AppointmentRepositoryOverlapTests.cs`:
  - `GivenAdjacentSlot_StartEqualsExistingEnd_WhenCheckOverlap_ThenReturnsFalse` — `[10:00,11:00)` vs `[11:00,12:00)`
  - `GivenContainedSlot_WhenCheckOverlap_ThenReturnsTrue` — `[10:00,12:00)` vs `[10:30,11:30)`
  - `GivenExactMatchSlot_WhenCheckOverlap_ThenReturnsTrue` — `[10:00,11:00)` vs `[10:00,11:00)`
  - `GivenPartialOverlapStart_WhenCheckOverlap_ThenReturnsTrue` — `[10:00,11:00)` vs `[10:30,11:30)`
  - `GivenPartialOverlapEnd_WhenCheckOverlap_ThenReturnsTrue` — `[10:00,11:00)` vs `[09:30,10:30)`

**Verify**: All boundary tests pass without changing production code.

**Checkpoint**: All three user stories complete and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Observability, lint, configuration hardening, and documentation.

- [ ] T040 [P] Add structured log events in `apps/appointment-worker-service/src/Core/Application/Services/TechnicianService.cs` and `BayService.cs` — log `ResourceCurrentlyOccupied` and `InvalidBookingRequest` at Warning level with `TenantId`, `TechnicianId`/`BayId`, and timeslot
- [ ] T041 [P] Add structured log event in `apps/appointment-worker-service/src/Infrastructure/Bulkhead/TenantBulkheadRouter.cs` — log `ChannelFull` at Warning with `TenantId` and current queue depth
- [ ] T042 Run `dotnet format apps/appointment-worker-service/AppointmentWorkerService.sln --verify-no-changes` and fix any formatting issues
- [ ] T043 Update `apps/appointment-worker-service/Dockerfile` if needed to ensure `tests/` directory is excluded from the runtime image
- [ ] T044 Verify `docker compose up -d` boots cleanly and manual smoke test passes (missing-field message → DLQ; overlapping slot → second booking rejected in cache)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 — can run **in parallel with Phase 3** after Phase 2 is done
- **US3 (Phase 5)**: Depends on T027 from Phase 3 (overlap implementation must exist)
- **Polish (Phase 6)**: Depends on all story phases

### Within User Story 1

```
T020–T025 (RED tests) → must FAIL first
    → T026 (DbContext) → T027 (AppointmentRepository overlap)
    → T028, T029, T030 in parallel (entity repositories)
    → T031, T032 in parallel (application services)
    → T033 (AppointmentProcessor refactor, depends on T031+T032)
    → T034 (Program.cs DI, depends on T033)
```

### Parallel Opportunities

- T002 and T003 (test project scaffolding) — parallel
- T006–T011 (domain entities & exceptions) — all parallel
- T013–T018 (port interfaces) — all parallel
- T028, T029, T030 (entity repository implementations) — parallel
- T031, T032 (application service implementations) — parallel after T028–T030
- T040, T041 (logging) — parallel

---

## Parallel Example: User Story 1 (RED phase)

```
# All of these can be written simultaneously:
T020 AppointmentMessageValidatorTests.cs
T021 TechnicianServiceTests.cs
T022 BayServiceTests.cs
T024 AppointmentRepositoryOverlapTests.cs
T025 TechnicianRepositoryTests.cs + ServiceBayRepositoryTests.cs + TechnicianSkillRepositoryTests.cs

# T023 (AppointmentProcessorAvailabilityTests.cs) depends on T021+T022 types existing
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (delete HTTP adapter, scaffold test projects)
2. Complete Phase 2: Foundational (domain entities, exceptions, all port interfaces)
3. Complete Phase 3: User Story 1 — RED then GREEN
4. **STOP and VALIDATE**: `dotnet test AppointmentWorkerService.sln` — all green
5. **MVP shipped**: Worker correctly validates and rejects conflicting bookings

### Incremental Delivery

1. Phase 1 + 2 → project compiles, ports defined
2. Phase 3 (US1) → core booking invariant working ✅
3. Phase 4 (US2) → noisy-neighbour protection added ✅
4. Phase 5 (US3) → overlap boundary tests locked in ✅
5. Phase 6 → production polish ✅

---

## Notes

- `[P]` = parallelizable (different files, no incomplete dependencies)
- `[US1/2/3]` = traceability label mapping task to spec user story
- TDD is **mandatory**: all RED tasks must fail before GREEN tasks begin
- `ScopedTenantService` currently hardcodes `"default-tenant"` — T034 must fix this so the actual `TenantId` from the message propagates to the EF Core global query filter
- The worker's `AppDbContext` adds `DbSet<Technician>`, `DbSet<ServiceBay>`, `DbSet<TechnicianSkill>` as read-only views of tables owned by the API service — no EF migrations are run by the worker for these tables
