# Research: Worker Core Logic (004-worker-core-logic)

## 1. Availability Engine: Service-Layer Architecture

### Decision
Remove `IBayAvailabilityService` entirely. Introduce a proper **Repository + Service** pair for each core domain entity the worker needs to reason about. The `AppointmentProcessor` (use case) interacts only with two application-layer service ports:

- **`ITechnicianService`** — validates technician existence, capability (skill match), and schedule availability
- **`IBayService`** — validates service bay existence and schedule availability

Each service port is backed by:
1. A **repository** port (`ITechnicianRepository`, `IServiceBayRepository`, `IAppointmentRepository` already exists) that provides raw data access
2. A **service** implementation in `Core/Application/Services/` that orchestrates the repositories and applies the domain rules

No infrastructure import ever reaches `AppointmentProcessor`. The dependency chain is:

```
AppointmentProcessor
  → ITechnicianService (port in Application/Ports/Services/)
      → ITechnicianRepository (port)
          → TechnicianRepository (EF Core, Infrastructure/Data/)
      → ITechnicianSkillRepository (port)
          → TechnicianSkillRepository (EF Core, Infrastructure/Data/)
      → IAppointmentRepository (port, existing)
  → IBayService (port in Application/Ports/Services/)
      → IServiceBayRepository (port)
          → ServiceBayRepository (EF Core, Infrastructure/Data/)
      → IAppointmentRepository (port, existing)
```

### Rationale
A single `IAvailabilityRepository` that collapses technician, bay, and skill queries into one interface violates the Single Responsibility Principle and makes mocking in unit tests awkward (all three behaviours share one mock). Splitting into focused entity repositories and wrapping them in service ports makes each concern independently testable, matches the hexagonal architecture pattern used throughout the API service, and gives a clear extension point for future entities.

### Alternatives Considered
- **`IAvailabilityRepository` (collapsed interface)** — rejected; mixed concerns, harder to unit test and extend.
- **Keep HTTP call to `bay-service`** — rejected; adds network latency and failure modes for a DB read.
- **Direct EF Core queries in `AppointmentProcessor`** — rejected; violates Constitution Principle II (infrastructure import in Application layer).

---

## 2. Core Entity Repositories (Read Model for Worker)

### Decision
The worker shares the same PostgreSQL database as the API service. Each domain entity the worker needs to read gets its own `IRepository` port and EF Core `DbSet<T>` in `AppDbContext`. Repositories are **read-only** for all entities except `TrackingRecord`:

| Entity | Repository Port | Worker Access |
|---|---|---|
| `Technician` | `ITechnicianRepository` | Read (existence check) |
| `ServiceBay` | `IServiceBayRepository` | Read (existence check) |
| `TechnicianSkill` | `ITechnicianSkillRepository` | Read (capability check) |
| `TrackingRecord` | `IAppointmentRepository` | Read + Write (existing, extended for overlap query) |

> `Customer`, `Vehicle`, `ServiceType`, `Tenant` do **not** need worker-side repositories — they are validated upstream by the API service before the message is published to the stream.

### Rationale
The message received from the Redis stream already carries validated `CustomerId`, `VehicleId`, `ServiceTypeId`, and `TenantId` — the API layer enforced their existence before publishing. The worker only needs to validate and reason about the **resources being allocated** (`Technician`, `ServiceBay`) and their **constraints** (`TechnicianSkill`).

---

## 3. Application Service Ports: `ITechnicianService` and `IBayService`

### Decision
Two application-layer service ports replace `IBayAvailabilityService`:

**`ITechnicianService`** (in `Core/Application/Ports/Services/`):
```csharp
public interface ITechnicianService
{
    /// Verifies technician exists, can perform the service type, and has no conflicting active bookings.
    Task ValidateAndCheckAvailabilityAsync(
        string technicianId,
        string serviceTypeId,
        DateTimeOffset startUtc,
        DateTimeOffset endUtc,
        CancellationToken ct = default);
    // Throws InvalidBookingRequestException if technician not found or incapable.
    // Throws ResourceCurrentlyOccupiedException if schedule conflict exists.
}
```

**`IBayService`** (in `Core/Application/Ports/Services/`):
```csharp
public interface IBayService
{
    /// Verifies service bay exists and has no conflicting active bookings.
    Task ValidateAndCheckAvailabilityAsync(
        string serviceBayId,
        DateTimeOffset startUtc,
        DateTimeOffset endUtc,
        CancellationToken ct = default);
    // Throws InvalidBookingRequestException if bay not found.
    // Throws ResourceCurrentlyOccupiedException if schedule conflict exists.
}
```

### Rationale
Service ports throw typed domain exceptions directly rather than returning booleans — this removes conditional branching from `AppointmentProcessor` and makes the happy path a straight pipeline. The processor does not need to know **why** a validation failed; the exception carries that context. This mirrors the pattern used in the API service use cases.

---

## 4. Overlap Detection: Half-Open Interval Semantics

### Decision
Two ranges `[A, B)` and `[C, D)` conflict iff `A < D AND C < B`. Applied in EF Core LINQ on `TrackingRecord`:

```csharp
await _appointmentRepository.HasActiveOverlapAsync(resourceId, startUtc, endUtc, ct)
```

The `IAppointmentRepository` is extended with `HasActiveOverlapAsync` for both technician and bay queries.

### Alternatives Considered
- **Closed interval** — rejected (adjacent slots would incorrectly conflict).
- **Raw SQL `tstzrange &&`** — viable but LINQ is sufficient and avoids raw SQL maintenance.

---

## 5. Input Validation: FluentValidation Guard

### Decision
`AppointmentMessageValidator` (FluentValidation) is the first gate in `AppointmentProcessor.ProcessAsync`. It rejects missing `TechnicianId`, `ServiceBayId`, `TenantId`, `ServiceTypeId`, `VehicleId`, `CustomerId` before any repository is called. Required fields that are null/empty → `InvalidBookingRequestException`.

---

## 6. UTC+0 Enforcement

### Decision
All `StartTime`/`EndTime` values on `TrackingRecord` are `DateTimeOffset`. Npgsql maps these to `timestamptz` (UTC storage). At the application boundary: `var startUtc = message.DesiredStartTime.ToUniversalTime()`. `EnableLegacyTimestampBehavior` must NOT be set.

---

## 7. Tenant Bulkhead: `System.Threading.Channels`

### Decision
Singleton `TenantBulkheadRouter` using `System.Threading.Channels.Channel<T>` (bounded) per tenant. Redis consumer fires `DispatchAsync(tenantId, handler)` — returns immediately. If channel full → NACK (do not acknowledge in Redis). Background drain tasks per tenant respect a `SemaphoreSlim` cap (default: 5 concurrent per tenant).

### Alternatives Considered
- **Polly `AsyncBulkheadPolicy`** — removed in Polly v8; Channels is the zero-dependency BCL replacement.
- **`SemaphoreSlim` alone** — blocks the consumer loop on overflow; rejected.

---

## 8. Testing Strategy

### Decision
- **Unit** (`Tests.Unit`): xUnit + Moq. Mock `ITechnicianService`, `IBayService`, `IAppointmentRepository`. Test `AppointmentProcessor` in isolation.
- **Integration** (`Tests.Integration`): xUnit + Testcontainers.PostgreSql. Test `TechnicianRepository`, `ServiceBayRepository`, `TechnicianSkillRepository`, and overlap query against real Postgres.
- **Concurrency** (in `Tests.Unit`): `TenantBulkheadRouterTests` — 50 + 1 tasks, assert tenant B completes < 500 ms.
