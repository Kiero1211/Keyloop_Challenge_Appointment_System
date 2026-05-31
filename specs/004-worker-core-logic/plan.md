# Implementation Plan: worker-core-logic

**Branch**: `004-worker-core-logic` | **Date**: 2026-05-31 | **Spec**: [spec.md](file:///Users/kiero/Desktop/Code/Keyloop/specs/004-worker-core-logic/spec.md)

**Input**: Feature specification from `specs/004-worker-core-logic/spec.md`

## Summary

Harden the `appointment-worker-service` (C# .NET 8) with two production capabilities:

1. **Availability Engine** — Remove `IBayAvailabilityService`. Introduce a clean `IRepository` + `IService` pair for each core entity (`Technician`, `ServiceBay`, `TechnicianSkill`). `AppointmentProcessor` checks resource availability exclusively through `ITechnicianService` and `IBayService` — two application-layer service ports that each orchestrate their own repositories and throw typed domain exceptions. This keeps the use case free of any data-access logic.

2. **Tenant Bulkhead** — Wrap per-tenant message dispatch in a `System.Threading.Channels`-backed `TenantBulkheadRouter` that caps concurrent handler executions per tenant at a configurable limit (default: 5), preventing whale tenants from starving others.

Both capabilities follow strict TDD: failing tests written first (xUnit + Moq), then minimal production code to make them green.

---

## Technical Context

**Language/Version**: C# 12, .NET 8

**Primary Dependencies**:
- `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.2 (existing)
- `FluentValidation.DependencyInjectionExtensions` 11.9.0 (existing)
- `Microsoft.Extensions.Hosting` 8.0.0 (existing)
- `StackExchange.Redis` 2.7.33 (existing)
- `xunit` + `Moq` + `Testcontainers.PostgreSql` (new, test projects only)

**Storage**: PostgreSQL via EF Core — shared DB with API service. Worker adds read-only `DbSet<T>` for `Technician`, `ServiceBay`, `TechnicianSkill`. `StartTime`/`EndTime` stored as `timestamptz` (UTC).

**Testing**: xUnit 2.x, Moq 4.x, Testcontainers.PostgreSql

**Target Platform**: Linux Docker container (.NET 8 Worker host model)

**Project Type**: Background Worker Service (no HTTP endpoints)

**Performance Goals**: Overlap query ≤ 50 ms p95 for 10k active records per tenant; bulkhead dispatch overhead < 1 ms per message

**Constraints**:
- Constitution Principles I–VI must be upheld
- No infrastructure imports in `Core/Domain` or `Core/Application`
- All DB queries scoped by `tenant_id` via `AppDbContext` global query filter
- `StartTime`/`EndTime` always UTC+0, enforced at application boundary
- FluentValidation for all C# worker input validation (constitution mandate)

**Scale/Scope**: 2 new test projects; ~12 new source files in Core; ~5 new files in Infrastructure; modifications to `AppDbContext`, `AppointmentRepository`, `AppointmentProcessor`, `Program.cs`

---

## Constitution Check

- [x] **I. Hexagonal Microservice Architecture & Role Separation**: All new logic stays inside `appointment-worker-service`. No HTTP added. Worker remains a pure background consumer. `IBayAvailabilityService` (HTTP adapter) is fully removed.
- [x] **II. Clean Architecture Boundaries**: Repository ports in `Core/Application/Ports/Repositories/`. Service ports in `Core/Application/Ports/Services/`. Service implementations in `Core/Application/Services/`. EF Core repository adapters in `Infrastructure/Data/`. Exceptions in `Core/Domain/Exceptions/`. No infrastructure namespace referenced from Core layers.
- [x] **III. Multi-Tenancy & Data Isolation**: `AppDbContext` global query filter enforces `tenant_id`. All new EF queries rely on this filter. Bulkhead keyed by `tenant_id`.
- [x] **IV. Spec-Driven & TDD**: All new logic covered by unit tests (mocked ports) written before implementation; integration tests (Testcontainers) written before EF implementation.
- [x] **V. Executive Command Execution Protocol**: Port interfaces defined in data-model.md first, then tests scaffolded, then implementation.
- [x] **VI. Monorepo & Docker**: New test projects under `apps/appointment-worker-service/tests/`. No new service created. `docker-compose.yml` unchanged.

---

## Project Structure

### Documentation (this feature)

```text
specs/004-worker-core-logic/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/appointment-worker-service/
├── src/
│   ├── Core/
│   │   ├── Domain/
│   │   │   ├── Entities/
│   │   │   │   ├── AppointmentMessage.cs              ← existing (unchanged)
│   │   │   │   ├── TrackingRecord.cs                  ← MODIFY: extend AppointmentStatus enum
│   │   │   │   ├── Technician.cs                      ← NEW (read-only domain entity)
│   │   │   │   ├── ServiceBay.cs                      ← NEW (read-only domain entity)
│   │   │   │   ├── TechnicianSkill.cs                 ← NEW (read-only domain entity)
│   │   │   │   └── IMustHaveTenant.cs                 ← existing (unchanged)
│   │   │   └── Exceptions/                            ← NEW directory
│   │   │       ├── ResourceCurrentlyOccupiedException.cs  ← NEW
│   │   │       └── InvalidBookingRequestException.cs      ← NEW
│   │   └── Application/
│   │       ├── Ports/
│   │       │   ├── Repositories/                      ← NEW subdirectory
│   │       │   │   ├── IAppointmentRepository.cs      ← MODIFY: add HasTechnicianOverlapAsync, HasBayOverlapAsync
│   │       │   │   ├── ITechnicianRepository.cs       ← NEW
│   │       │   │   ├── IServiceBayRepository.cs       ← NEW
│   │       │   │   └── ITechnicianSkillRepository.cs  ← NEW
│   │       │   ├── Services/                          ← NEW subdirectory
│   │       │   │   ├── ITechnicianService.cs          ← NEW
│   │       │   │   └── IBayService.cs                 ← NEW
│   │       │   ├── IAppointmentProcessor.cs           ← existing (unchanged)
│   │       │   ├── ICacheProvider.cs                  ← existing (unchanged)
│   │       │   └── IBayAvailabilityService.cs         ← DELETE (removed from DI and source)
│   │       ├── Services/                              ← NEW directory
│   │       │   ├── TechnicianService.cs               ← NEW (implements ITechnicianService)
│   │       │   └── BayService.cs                      ← NEW (implements IBayService)
│   │       ├── Validators/                            ← NEW directory
│   │       │   └── AppointmentMessageValidator.cs     ← NEW
│   │       └── UseCases/
│   │           └── AppointmentProcessor.cs            ← MODIFY: inject ITechnicianService + IBayService
│   └── Infrastructure/
│       ├── Bulkhead/                                  ← NEW directory
│       │   └── TenantBulkheadRouter.cs                ← NEW
│       ├── Data/
│       │   ├── AppDbContext.cs                        ← MODIFY: add DbSet<Technician/ServiceBay/TechnicianSkill> + timestamptz config
│       │   ├── AppointmentRepository.cs               ← MODIFY: implement HasTechnicianOverlapAsync, HasBayOverlapAsync
│       │   ├── TechnicianRepository.cs                ← NEW
│       │   ├── ServiceBayRepository.cs                ← NEW
│       │   └── TechnicianSkillRepository.cs           ← NEW
│       ├── Workers/
│       │   └── RedisStreamConsumerService.cs          ← MODIFY: route through TenantBulkheadRouter
│       ├── Http/
│       │   └── HttpBayAvailabilityService.cs          ← DELETE
│       ├── Cache/
│       │   └── CacheProvider.cs                      ← existing (unchanged)
│       └── Redis/
│           └── RedisConnectionProvider.cs             ← existing (unchanged)
├── tests/
│   ├── AppointmentWorkerService.Tests.Unit/
│   │   ├── AppointmentWorkerService.Tests.Unit.csproj       ← NEW
│   │   ├── Application/
│   │   │   ├── AppointmentProcessorAvailabilityTests.cs     ← NEW (Test A)
│   │   │   ├── TechnicianServiceTests.cs                    ← NEW
│   │   │   ├── BayServiceTests.cs                           ← NEW
│   │   │   └── AppointmentMessageValidatorTests.cs          ← NEW
│   │   └── Infrastructure/
│   │       └── TenantBulkheadRouterTests.cs                 ← NEW (Test B - concurrency)
│   └── AppointmentWorkerService.Tests.Integration/
│       ├── AppointmentWorkerService.Tests.Integration.csproj ← NEW
│       └── Data/
│           ├── AppointmentRepositoryOverlapTests.cs          ← NEW
│           ├── TechnicianRepositoryTests.cs                  ← NEW
│           ├── ServiceBayRepositoryTests.cs                  ← NEW
│           └── TechnicianSkillRepositoryTests.cs             ← NEW
├── AppointmentWorkerService.sln                             ← NEW
└── Dockerfile                                               ← existing (unchanged)
```

**Structure Decision**: Ports are split into `Ports/Repositories/` and `Ports/Services/` subdirectories. Application service implementations live in `Core/Application/Services/` — same layer as `UseCases/`, never touching infrastructure. EF Core repository adapters live in `Infrastructure/Data/`.

---

## Proposed Changes

### Phase 1 — Domain Layer: Exceptions, Entities, Status Enum

#### [NEW] `Core/Domain/Exceptions/ResourceCurrentlyOccupiedException.cs`
Domain exception. Code: `RESOURCE_CURRENTLY_OCCUPIED`. Message includes resource ID and conflicting timeslot.

#### [NEW] `Core/Domain/Exceptions/InvalidBookingRequestException.cs`
Domain exception. Code: `INVALID_BOOKING_REQUEST`. Message includes the specific reason.

#### [MODIFY] `Core/Domain/Entities/TrackingRecord.cs`
Extend `AppointmentStatus` with `Scheduled`, `InProgress`, `Cancelled`, `Completed`.

#### [NEW] `Core/Domain/Entities/Technician.cs`
Simple read-only domain entity: `Id`, `TenantId`, `Name`. Implements `IMustHaveTenant`.

#### [NEW] `Core/Domain/Entities/ServiceBay.cs`
Simple read-only domain entity: `Id`, `TenantId`, `Name`. Implements `IMustHaveTenant`.

#### [NEW] `Core/Domain/Entities/TechnicianSkill.cs`
Read-only domain entity: `TechnicianId`, `ServiceTypeId`, `TenantId`. Composite PK.

---

### Phase 2 — Port Interfaces

#### [MODIFY] `Core/Application/Ports/Repositories/IAppointmentRepository.cs`
Add two overlap query methods:
- `HasTechnicianOverlapAsync(string technicianId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct)` — returns `true` if any `Scheduled`/`InProgress` appointment overlaps
- `HasBayOverlapAsync(string serviceBayId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct)` — same for bays

#### [NEW] `Core/Application/Ports/Repositories/ITechnicianRepository.cs`
Single method: `ExistsAsync(string technicianId, CancellationToken ct)`.

#### [NEW] `Core/Application/Ports/Repositories/IServiceBayRepository.cs`
Single method: `ExistsAsync(string serviceBayId, CancellationToken ct)`.

#### [NEW] `Core/Application/Ports/Repositories/ITechnicianSkillRepository.cs`
Single method: `HasSkillAsync(string technicianId, string serviceTypeId, CancellationToken ct)`.

#### [NEW] `Core/Application/Ports/Services/ITechnicianService.cs`
Single method: `ValidateAndCheckAvailabilityAsync(technicianId, serviceTypeId, startUtc, endUtc, ct)`.
Throws `InvalidBookingRequestException` or `ResourceCurrentlyOccupiedException`.

#### [NEW] `Core/Application/Ports/Services/IBayService.cs`
Single method: `ValidateAndCheckAvailabilityAsync(serviceBayId, startUtc, endUtc, ct)`.
Throws `InvalidBookingRequestException` or `ResourceCurrentlyOccupiedException`.

#### [NEW] `Core/Application/Validators/AppointmentMessageValidator.cs`
FluentValidation. Required: `TenantId`, `TechnicianId`, `ServiceBayId`, `ServiceTypeId`, `VehicleId`, `CustomerId`, `DesiredStartTime`.

#### [DELETE] `Core/Application/Ports/IBayAvailabilityService.cs`
Removed entirely.

---

### Phase 3 — Unit Tests (RED — must fail before implementation)

#### [NEW] `Tests.Unit/Application/AppointmentProcessorAvailabilityTests.cs`
Mocks: `ITechnicianService`, `IBayService`, `IAppointmentRepository`, `ICacheProvider`.

- `GivenMissingTechnicianId_WhenProcessAsync_ThenThrowsInvalidBookingRequest`
- `GivenMissingServiceBayId_WhenProcessAsync_ThenThrowsInvalidBookingRequest`
- `GivenTechnicianServiceThrowsInvalidRequest_WhenProcessAsync_ThenPropagates`
- `GivenTechnicianServiceThrowsResourceOccupied_WhenProcessAsync_ThenPropagates`
- `GivenBayServiceThrowsResourceOccupied_WhenProcessAsync_ThenPropagates`
- `GivenBothServicesOk_WhenProcessAsync_ThenPersistsConfirmedRecord`
- `GivenBothServicesOk_WhenProcessAsync_ThenAcknowledgesStreamMessage`

#### [NEW] `Tests.Unit/Application/TechnicianServiceTests.cs`
Mocks: `ITechnicianRepository`, `ITechnicianSkillRepository`, `IAppointmentRepository`.

- `GivenTechnicianNotFound_ThenThrowsInvalidBookingRequest`
- `GivenTechnicianLacksSkill_ThenThrowsInvalidBookingRequest`
- `GivenTechnicianHasActiveOverlap_ThenThrowsResourceCurrentlyOccupied`
- `GivenTechnicianAvailable_ThenCompletesWithoutException`

#### [NEW] `Tests.Unit/Application/BayServiceTests.cs`
Mocks: `IServiceBayRepository`, `IAppointmentRepository`.

- `GivenBayNotFound_ThenThrowsInvalidBookingRequest`
- `GivenBayHasActiveOverlap_ThenThrowsResourceCurrentlyOccupied`
- `GivenBayAvailable_ThenCompletesWithoutException`

#### [NEW] `Tests.Unit/Application/AppointmentMessageValidatorTests.cs`
- `GivenNullTechnicianId_ThenValidationFails`
- `GivenNullServiceBayId_ThenValidationFails`
- `GivenAllFieldsPresent_ThenValidationPasses`

#### [NEW] `Tests.Unit/Infrastructure/TenantBulkheadRouterTests.cs` *(Test B)*
- `GivenFiftyTenantA_AndOneTenantB_WhenDispatched_ThenTenantBCompletesWithin500ms`
- `GivenChannelFull_WhenDispatched_ThenReturnsChannelFullResult`

---

### Phase 4 — Integration Tests (RED — real Postgres via Testcontainers)

#### [NEW] `Tests.Integration/Data/AppointmentRepositoryOverlapTests.cs`
Tests `HasTechnicianOverlapAsync` and `HasBayOverlapAsync` with seeded data:
- `GivenInProgressRecord_WhenCheckTechnicianOverlap_ThenReturnsTrue`
- `GivenScheduledRecord_WhenCheckTechnicianOverlap_ThenReturnsTrue`
- `GivenCancelledRecord_WhenCheckTechnicianOverlap_ThenReturnsFalse`
- `GivenCompletedRecord_WhenCheckTechnicianOverlap_ThenReturnsFalse`
- `GivenDifferentTenant_WhenCheckTechnicianOverlap_ThenReturnsFalse`
- `GivenAdjacentSlot_WhenCheckTechnicianOverlap_ThenReturnsFalse`
- `GivenExactMatchSlot_WhenCheckBayOverlap_ThenReturnsTrue`

#### [NEW] `Tests.Integration/Data/TechnicianRepositoryTests.cs`
- `GivenTechnicianExists_WhenExistsAsync_ThenReturnsTrue`
- `GivenTechnicianMissing_WhenExistsAsync_ThenReturnsFalse`

#### [NEW] `Tests.Integration/Data/ServiceBayRepositoryTests.cs`
- `GivenBayExists_WhenExistsAsync_ThenReturnsTrue`
- `GivenBayMissing_WhenExistsAsync_ThenReturnsFalse`

#### [NEW] `Tests.Integration/Data/TechnicianSkillRepositoryTests.cs`
- `GivenSkillExists_WhenHasSkillAsync_ThenReturnsTrue`
- `GivenNoSkill_WhenHasSkillAsync_ThenReturnsFalse`

---

### Phase 5 — Production Implementation (GREEN — make tests pass)

#### [MODIFY] `Infrastructure/Data/AppDbContext.cs`
- Add `DbSet<Technician>`, `DbSet<ServiceBay>`, `DbSet<TechnicianSkill>` (no EF migrations — tables owned by API service)
- Configure `StartTime`/`EndTime` as `timestamptz` in `OnModelCreating`
- Ensure Npgsql `EnableLegacyTimestampBehavior` is NOT set

#### [MODIFY] `Infrastructure/Data/AppointmentRepository.cs`
Implement `HasTechnicianOverlapAsync` and `HasBayOverlapAsync`:

```csharp
// Half-open interval: conflict iff StartTime < endUtc AND EndTime > startUtc
// Global query filter already scopes by tenant_id
var blocked = new[] { AppointmentStatus.Scheduled, AppointmentStatus.InProgress };

public async Task<bool> HasTechnicianOverlapAsync(
    string technicianId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct)
    => await _db.Set<TrackingRecord>()
        .AnyAsync(r =>
            r.TechnicianId == technicianId &&
            blocked.Contains(r.Status) &&
            r.StartTime < endUtc &&
            r.EndTime > startUtc, ct);
```

#### [NEW] `Infrastructure/Data/TechnicianRepository.cs`
EF Core implementation of `ITechnicianRepository`.

#### [NEW] `Infrastructure/Data/ServiceBayRepository.cs`
EF Core implementation of `IServiceBayRepository`.

#### [NEW] `Infrastructure/Data/TechnicianSkillRepository.cs`
EF Core implementation of `ITechnicianSkillRepository`.

#### [NEW] `Core/Application/Services/TechnicianService.cs`
Implements `ITechnicianService`. Orchestrates:
1. `ITechnicianRepository.ExistsAsync` → `InvalidBookingRequestException` if `false`
2. `ITechnicianSkillRepository.HasSkillAsync` → `InvalidBookingRequestException` if `false`
3. `IAppointmentRepository.HasTechnicianOverlapAsync` → `ResourceCurrentlyOccupiedException` if `true`

#### [NEW] `Core/Application/Services/BayService.cs`
Implements `IBayService`. Orchestrates:
1. `IServiceBayRepository.ExistsAsync` → `InvalidBookingRequestException` if `false`
2. `IAppointmentRepository.HasBayOverlapAsync` → `ResourceCurrentlyOccupiedException` if `true`

#### [MODIFY] `Core/Application/UseCases/AppointmentProcessor.cs`
Remove `IBayAvailabilityService`. Inject `ITechnicianService`, `IBayService`, `IValidator<AppointmentMessage>`. New processing sequence:

```
1. _validator.ValidateAndThrow(message) → InvalidBookingRequestException if fails
2. var startUtc = message.DesiredStartTime.ToUniversalTime()
3. await _technicianService.ValidateAndCheckAvailabilityAsync(...)
4. await _bayService.ValidateAndCheckAvailabilityAsync(...)
5. Persist TrackingRecord (Status = Confirmed, StartTime/EndTime UTC)
6. Update Redis cache
7. ACK stream message
```

#### [NEW] `Infrastructure/Bulkhead/TenantBulkheadRouter.cs`
Singleton. `ConcurrentDictionary<string, (BoundedChannel<Func<Task>>, SemaphoreSlim)>`.
- `DispatchAsync(tenantId, handler)` → writes to bounded channel → returns `DispatchResult` (Dispatched | ChannelFull)
- Background drain task per tenant respects `SemaphoreSlim` (max concurrent)

#### [MODIFY] `Infrastructure/Workers/RedisStreamConsumerService.cs`
After deserializing message: `var result = await _bulkheadRouter.DispatchAsync(message.TenantId, handler)`. If `ChannelFull` → do NOT acknowledge → `continue`.

#### [MODIFY] `Program.cs`
- **Remove**: `IBayAvailabilityService` / `HttpBayAvailabilityService` registration
- **Add** (all scoped unless noted):
  - `IAppointmentRepository → AppointmentRepository`
  - `ITechnicianRepository → TechnicianRepository`
  - `IServiceBayRepository → ServiceBayRepository`
  - `ITechnicianSkillRepository → TechnicianSkillRepository`
  - `ITechnicianService → TechnicianService`
  - `IBayService → BayService`
  - `TenantBulkheadRouter` (singleton)
  - `services.AddValidatorsFromAssemblyContaining<AppointmentMessageValidator>()`
  - Bind `WorkerOptions` from config (`WORKER_BULKHEAD_MAX_CONCURRENT`, `WORKER_BULKHEAD_QUEUE_CAPACITY`)

#### [DELETE] `Infrastructure/Http/HttpBayAvailabilityService.cs`
Remove file entirely.

---

## Verification Plan

### Automated Tests

```bash
cd apps/appointment-worker-service

# Unit tests (no Docker)
dotnet test tests/AppointmentWorkerService.Tests.Unit/ --logger "console;verbosity=detailed"

# Integration tests (Docker required for Testcontainers)
dotnet test tests/AppointmentWorkerService.Tests.Integration/ --logger "console;verbosity=detailed"

# Full solution
dotnet test AppointmentWorkerService.sln
```

Expected: All tests green. Zero skipped.

### Lint Pass
```bash
dotnet format apps/appointment-worker-service/AppointmentWorkerService.sln --verify-no-changes
```

### Manual Smoke Test
```bash
docker compose up -d
# 1. Send message missing TechnicianId → expect DLQ entry
redis-cli XADD appointments_stream '*' payload '{"tenantId":"t1","vehicleId":"v1","customerId":"c1","serviceTypeId":"s1","desiredStartTime":"2026-06-01T10:00:00Z","source":"api"}'
redis-cli XLEN appointments_stream_dlq   # expect 1

# 2. Send valid message for an occupied slot → expect second booking rejected
# (seed a Scheduled record first, then publish two overlapping messages)
```

---

## Complexity Tracking

> No Constitution violations. `IBayAvailabilityService` and its HTTP adapter are fully removed. The `Ports/` directory is restructured into `Ports/Repositories/` and `Ports/Services/` subdirectories — a convention improvement, not a violation.
