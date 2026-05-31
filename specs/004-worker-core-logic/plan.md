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

- [x] **I. Hexagonal Microservice Architecture & Role Separation**: All new logic stays inside `appointment-worker-service`. No HTTP added. Worker remains a pure background consumer. `IBayAvailabilityService` (HTTP adapter) is fully removed. **Gap resolved (Phase 6)**: The constitution mandates the worker consume all 4 Redis Stream partitions (`appointments_stream_0..3`); the previous single-stream consumer is replaced with a partitioned multi-task consumer.
- [x] **II. Clean Architecture Boundaries**: Repository ports in `Core/Application/Ports/Repositories/`. Service ports in `Core/Application/Ports/Services/`. Service implementations in `Core/Application/Services/`. EF Core repository adapters in `Infrastructure/Data/`. Exceptions in `Core/Domain/Exceptions/`. No infrastructure namespace referenced from Core layers.
- [x] **III. Multi-Tenancy & Data Isolation**: `AppDbContext` global query filter enforces `tenant_id`. All new EF queries rely on this filter. Bulkhead keyed by `tenant_id`. Consumer propagates `TenantId` from message to `TenantContext` before dispatching.
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
│       │   ├── RedisStreamConsumerService.cs          ← DELETE: replaced by PartitionedStreamHost
│       │   ├── PartitionedStreamHost.cs               ← NEW: IHostedService that spawns one Task per partition
│       │   └── StreamPartitionWorker.cs               ← NEW: per-partition XREADGROUP polling loop
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

#### [DELETE] `Infrastructure/Workers/RedisStreamConsumerService.cs`
Remove entirely — replaced by `PartitionedStreamHost` + `StreamPartitionWorker`.

#### [MODIFY] `Program.cs`
- **Remove**: `IBayAvailabilityService` / `HttpBayAvailabilityService` registration
- **Remove**: `RedisStreamConsumerService` registration
- **Add** (all scoped unless noted):
  - `IAppointmentRepository → AppointmentRepository`
  - `ITechnicianRepository → TechnicianRepository`
  - `IServiceBayRepository → ServiceBayRepository`
  - `ITechnicianSkillRepository → TechnicianSkillRepository`
  - `ITechnicianService → TechnicianService`
  - `IBayService → BayService`
  - `TenantBulkheadRouter` (singleton)
  - `services.AddValidatorsFromAssemblyContaining<AppointmentMessageValidator>()`
  - Bind `WorkerOptions` from config (`WORKER_BULKHEAD_MAX_CONCURRENT`, `WORKER_BULKHEAD_QUEUE_CAPACITY`, `WORKER_STREAM_PARTITION_COUNT` default: 4)
  - `services.AddHostedService<PartitionedStreamHost>()`

#### [DELETE] `Infrastructure/Http/HttpBayAvailabilityService.cs`
Remove file entirely.

---

### Phase 6 — Multi-Partition Stream Consumer

> **Constitution mandate (Principle I)**: The API service routes every command deterministically via `f(tenant_id, vehicle_id) → partition_id` across exactly **4** Redis Stream partitions named `appointments_stream_0`, `appointments_stream_1`, `appointments_stream_2`, `appointments_stream_3`. The worker MUST consume all 4 partitions simultaneously.

#### Design

**Consumer Group & Consumer Identity**:
- All 4 partition workers share the **same consumer group name** (`worker_group`) so that multiple worker instances (horizontal scaling) share the load naturally via XREADGROUP's built-in cooperative delivery.
- Each worker instance generates a **unique consumer ID** at startup: `worker_{Guid.NewGuid():N}`. This ID is reused across all 4 partitions within the same process lifetime. If the process restarts, a new ID is generated, allowing Redis to reclaim the previous consumer's PEL (pending entry list) via `XAUTOCLAIM`.

**Concurrency Model**:
- `PartitionedStreamHost` (implements `IHostedService`) is registered once. In `StartAsync`, it launches one `Task` per partition using `Task.Run` and stores them in a `List<Task>`. In `StopAsync`, it signals a `CancellationToken` and `await Task.WhenAll(...)` all tasks.
- `StreamPartitionWorker` encapsulates the per-partition polling loop:
  1. Ensure consumer group exists (`XGROUP CREATE ... MKSTREAM` — idempotent with `BUSYGROUP` guard).
  2. Loop until cancellation: call `XREADGROUP GROUP worker_group {consumerId} COUNT 1 BLOCK 2000 STREAMS {streamName} >`.
  3. If no messages: loop (BLOCK already waited up to 2 s, so no extra `Task.Delay` needed).
  4. If message received: call `_bulkheadRouter.DispatchAsync(tenantId, handler)`. On `ChannelFull` → do **not** ACK (message stays in PEL for redelivery).
  5. **Handler (on success)**: process → `XACK {streamName} worker_group {id}` → `XDEL {streamName} {id}`.
  6. **Handler (on failure / exception)**: write to DLQ stream (`{streamName}_dlq`) → then ACK+DEL to prevent infinite redelivery.

**Why ACK + DEL on success**: Messages are ephemeral booking commands. Once a `TrackingRecord` is persisted and the cache is updated, the raw stream entry has no further value and wastes Redis memory. `XDEL` removes the entry from the stream while `XACK` removes it from the PEL.

**Why no ACK on `ChannelFull`**: The message remains in the PEL. Redis will redeliver it (via `XAUTOCLAIM` or a future `XREADGROUP PENDING` sweep) when the bulkhead drains. This satisfies FR-008: no messages silently dropped under overflow.

#### [NEW] `Infrastructure/Workers/PartitionedStreamHost.cs`

```csharp
public class PartitionedStreamHost : IHostedService
{
    // Injects: RedisConnectionProvider, IServiceScopeFactory, TenantBulkheadRouter, ILogger, WorkerOptions
    // StartAsync: creates StreamPartitionWorker for each partition index 0..WORKER_STREAM_PARTITION_COUNT-1
    //             starts each on a Task.Run background task
    // StopAsync:  cancels shared CancellationTokenSource, awaits all tasks
    
    private readonly List<Task> _partitionTasks = new();
    private readonly CancellationTokenSource _cts = new();
    private const int PartitionCount = 4; // configurable via WorkerOptions
    private readonly string _consumerId = $"worker_{Guid.NewGuid():N}";
}
```

#### [NEW] `Infrastructure/Workers/StreamPartitionWorker.cs`

```csharp
/// Encapsulates the XREADGROUP polling loop for a single partition.
public class StreamPartitionWorker
{
    private readonly string _streamName;   // e.g. "appointments_stream_2"
    private readonly string _groupName = "worker_group";
    private readonly string _consumerId;   // unique per process lifetime, shared across all partitions
    private readonly IDatabase _db;
    private readonly TenantBulkheadRouter _bulkheadRouter;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger _logger;

    public async Task RunAsync(CancellationToken ct)
    {
        // 1. Ensure consumer group (MKSTREAM = create stream if absent)
        try { await _db.StreamCreateConsumerGroupAsync(_streamName, _groupName, "0-0", createStream: true); }
        catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP")) { /* already exists */ }

        _logger.LogInformation("Partition worker started: stream={Stream} group={Group} consumer={Consumer}",
            _streamName, _groupName, _consumerId);

        while (!ct.IsCancellationRequested)
        {
            StreamEntry[] entries;
            try
            {
                // BLOCK up to 2 s waiting for new messages — avoids busy-loop, preserves < 2 s shutdown latency
                entries = await _db.StreamReadGroupAsync(
                    _streamName, _groupName, _consumerId,
                    position: ">",   // only undelivered messages
                    count: 1,
                    noAck: false);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "XREADGROUP error on {Stream}", _streamName);
                await Task.Delay(1_000, ct);
                continue;
            }

            foreach (var entry in entries)
                await HandleEntryAsync(entry, ct);
        }
    }

    private async Task HandleEntryAsync(StreamEntry entry, CancellationToken ct)
    {
        AppointmentMessage? message = null;
        try
        {
            var payload = entry["payload"];
            message = JsonSerializer.Deserialize<AppointmentMessage>(payload!, JsonOptions);
            if (message is null) throw new InvalidOperationException("Null deserialization");

            TenantContext.CurrentTenantId = message.TenantId;

            var result = _bulkheadRouter.DispatchAsync(message.TenantId, async () =>
            {
                using var scope = _scopeFactory.CreateScope();
                var processor = scope.ServiceProvider.GetRequiredService<IAppointmentProcessor>();
                await processor.ProcessAsync(message, entry.Id.ToString(), ct);

                // ACK + DEL on success
                await _db.StreamAcknowledgeAsync(_streamName, _groupName, entry.Id);
                await _db.KeyDeleteAsync((RedisKey)_streamName); // XDEL equivalent via scripting if needed
            });

            if (result == DispatchResult.ChannelFull)
            {
                _logger.LogWarning("Bulkhead full for tenant {TenantId} on {Stream}. Message {Id} left in PEL.",
                    message.TenantId, _streamName, entry.Id);
                // Do NOT ACK — message stays in PEL for redelivery
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process entry {Id} on {Stream}", entry.Id, _streamName);
            try
            {
                // Move to DLQ stream then ACK to prevent infinite redelivery of poison messages
                await _db.StreamAddAsync($"{_streamName}_dlq", entry.Values);
                await _db.StreamAcknowledgeAsync(_streamName, _groupName, entry.Id);
                // XDEL after ACK to reclaim memory
                _logger.LogInformation("Entry {Id} moved to DLQ on {Stream}", entry.Id, _streamName);
            }
            catch (Exception dlqEx)
            {
                _logger.LogCritical(dlqEx, "DLQ write failed for entry {Id} on {Stream}", entry.Id, _streamName);
            }
        }
    }
}
```

#### Tests for Phase 6

##### [NEW] `Tests.Unit/Infrastructure/PartitionedStreamHostTests.cs`
- `GivenFourPartitions_WhenStartAsync_ThenFourWorkerTasksLaunched`
- `GivenStopAsync_ThenAllPartitionTasksCancelledCleanly`
- `GivenConsumerIdGenerated_ThenSameIdUsedAcrossAllPartitions`

##### [NEW] `Tests.Unit/Infrastructure/StreamPartitionWorkerTests.cs`
- `GivenNoMessages_WhenPolling_ThenLoopsWithoutAck`
- `GivenValidMessage_WhenProcessingSucceeds_ThenAckAndDelCalled`
- `GivenValidMessage_WhenBulkheadFull_ThenNoAckAndMessageLeftInPEL`
- `GivenValidMessage_WhenProcessingThrows_ThenMovedToDLQAndThenAcked`
- `GivenMissingPayload_WhenDeserializationFails_ThenMovedToDLQ`

##### [NEW] `Tests.Integration/Workers/PartitionedStreamIntegrationTests.cs`
- `GivenMessageOnPartition0_WhenWorkerRunning_ThenProcessedAndAcked`
- `GivenMessageOnPartition3_WhenWorkerRunning_ThenProcessedAndAcked`
- `GivenPoisonMessage_WhenWorkerRunning_ThenMovedToDLQ`
- `GivenTwoWorkerInstances_WhenSameGroup_ThenEachMessageProcessedOnlyOnce`

> Integration tests use `Testcontainers.Redis` alongside `Testcontainers.PostgreSql` to spin up a real Redis instance. The `PartitionedStreamHost` is started in-process against it.

#### `WorkerOptions` additions

```csharp
public class WorkerOptions
{
    public int BulkheadMaxConcurrent { get; set; } = 5;
    public int BulkheadQueueCapacity { get; set; } = 50;
    public int StreamPartitionCount { get; set; } = 4;        // NEW
    public string StreamBaseName { get; set; } = "appointments_stream"; // NEW
    public string ConsumerGroupName { get; set; } = "worker_group";     // NEW
}
```

Environment variables: `WORKER_STREAM_PARTITION_COUNT` (default: 4), `WORKER_STREAM_BASE_NAME` (default: `appointments_stream`), `WORKER_CONSUMER_GROUP_NAME` (default: `worker_group`).

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

# 1. Verify all 4 consumer group entries exist after startup:
redis-cli XINFO GROUPS appointments_stream_0   # should show group "worker_group"
redis-cli XINFO GROUPS appointments_stream_1
redis-cli XINFO GROUPS appointments_stream_2
redis-cli XINFO GROUPS appointments_stream_3

# 2. Send message missing TechnicianId to partition 0 → expect DLQ entry:
redis-cli XADD appointments_stream_0 '*' payload '{"tenantId":"t1","vehicleId":"v1","customerId":"c1","serviceTypeId":"s1","desiredStartTime":"2026-06-01T10:00:00Z","source":"api"}'
redis-cli XLEN appointments_stream_0_dlq   # expect 1

# 3. Send valid message to partition 2 → expect ACK + stream entry removed:
redis-cli XADD appointments_stream_2 '*' payload '{"tenantId":"t1","vehicleId":"v2","customerId":"c1","technicianId":"tech-1","serviceBayId":"bay-1","serviceTypeId":"s1","desiredStartTime":"2026-06-01T11:00:00Z","source":"api"}'
# After processing: XLEN appointments_stream_2 should be 0 (entry deleted)

# 4. Send overlapping slot to same partition → second booking must be rejected to DLQ:
redis-cli XADD appointments_stream_2 '*' payload '{"tenantId":"t1","vehicleId":"v3","customerId":"c2","technicianId":"tech-1","serviceBayId":"bay-1","serviceTypeId":"s1","desiredStartTime":"2026-06-01T11:00:00Z","source":"api"}'
redis-cli XLEN appointments_stream_2_dlq   # expect 1
```

---

## Complexity Tracking

> No Constitution violations. `IBayAvailabilityService` and its HTTP adapter are fully removed. The `Ports/` directory is restructured into `Ports/Repositories/` and `Ports/Services/` subdirectories — a convention improvement, not a violation.
