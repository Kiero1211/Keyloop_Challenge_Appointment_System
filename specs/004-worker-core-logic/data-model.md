# Data Model: Worker Core Logic (004-worker-core-logic)

## Modified Entities

### `TrackingRecord` *(modify — extend status enum + timestamptz)*

The existing `TrackingRecord` entity in `Core/Domain/Entities/TrackingRecord.cs`.

| Field | Type | Notes |
|---|---|---|
| `Id` | `Guid` | PK — unchanged |
| `TenantId` | `string` | FK to Tenant — unchanged |
| `VehicleId` | `string` | — unchanged |
| `CustomerId` | `string` | — unchanged |
| `ServiceTypeId` | `string` | — unchanged |
| `ServiceBayId` | `string` | — unchanged |
| `TechnicianId` | `string` | — unchanged |
| `StartTime` | `DateTimeOffset` | **UTC+0 enforced** — EF column type `timestamptz` |
| `EndTime` | `DateTimeOffset` | **UTC+0 enforced** — EF column type `timestamptz` |
| `Status` | `AppointmentStatus` | Extended — see Status Enum below |
| `Version` | `uint` | xmin row-version for optimistic concurrency — unchanged |

### `AppointmentStatus` Enum *(modify — extend values)*

```
Pending      → Initial state on message arrival (existing)
Confirmed    → Successfully booked (existing)
Rejected     → Could not be booked (existing)
Scheduled    → Confirmed and scheduled for future (NEW — BLOCKS new bookings)
InProgress   → Appointment currently ongoing (NEW — BLOCKS new bookings)
Cancelled    → Appointment cancelled (NEW — does NOT block new bookings)
Completed    → Appointment finished (NEW — does NOT block new bookings)
```

**Blocking rule**: Only `Scheduled` and `InProgress` cause `ResourceCurrentlyOccupiedException`. All others are non-blocking.

---

## New Read-Only Domain Entities (worker reads, API service owns migrations)

### `Technician` *(new DbSet in worker — read-only)*

| Field | Type | Notes |
|---|---|---|
| `Id` | `string` | PK |
| `TenantId` | `string` | Multi-tenancy scope |
| `Name` | `string` | — |

### `ServiceBay` *(new DbSet in worker — read-only)*

| Field | Type | Notes |
|---|---|---|
| `Id` | `string` | PK |
| `TenantId` | `string` | Multi-tenancy scope |
| `Name` | `string` | — |

### `TechnicianSkill` *(new DbSet in worker — read-only)*

| Field | Type | Notes |
|---|---|---|
| `TechnicianId` | `string` | FK to Technician |
| `ServiceTypeId` | `string` | FK to ServiceType |
| `TenantId` | `string` | Multi-tenancy scope |

**Constraint**: A technician can perform a service type iff a `TechnicianSkill` row exists with matching `TechnicianId`, `ServiceTypeId`, and `TenantId`.

---

## New Repository Ports

All repository ports live in `Core/Application/Ports/Repositories/`.

### `ITechnicianRepository` *(new)*

```csharp
public interface ITechnicianRepository
{
    Task<bool> ExistsAsync(string technicianId, CancellationToken ct = default);
}
```

### `IServiceBayRepository` *(new)*

```csharp
public interface IServiceBayRepository
{
    Task<bool> ExistsAsync(string serviceBayId, CancellationToken ct = default);
}
```

### `ITechnicianSkillRepository` *(new)*

```csharp
public interface ITechnicianSkillRepository
{
    Task<bool> HasSkillAsync(string technicianId, string serviceTypeId, CancellationToken ct = default);
}
```

### `IAppointmentRepository` *(modify — add overlap query methods)*

```csharp
public interface IAppointmentRepository
{
    // Existing:
    Task<TrackingRecord?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(TrackingRecord record, CancellationToken ct = default);
    Task UpdateAsync(TrackingRecord record, CancellationToken ct = default);

    // NEW — half-open interval overlap: StartTime < endUtc AND EndTime > startUtc
    // Only counts appointments with Status == Scheduled or InProgress
    Task<bool> HasTechnicianOverlapAsync(string technicianId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct = default);
    Task<bool> HasBayOverlapAsync(string serviceBayId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct = default);
}
```

---

## New Application Service Ports

Service ports live in `Core/Application/Ports/Services/`.

### `ITechnicianService` *(new)*

```csharp
public interface ITechnicianService
{
    /// Validates technician exists, can perform the given service type,
    /// and has no active scheduling conflict in the requested window.
    /// Throws InvalidBookingRequestException if not found or incapable.
    /// Throws ResourceCurrentlyOccupiedException if schedule conflict exists.
    Task ValidateAndCheckAvailabilityAsync(
        string technicianId,
        string serviceTypeId,
        DateTimeOffset startUtc,
        DateTimeOffset endUtc,
        CancellationToken ct = default);
}
```

### `IBayService` *(new)*

```csharp
public interface IBayService
{
    /// Validates service bay exists and has no active scheduling conflict.
    /// Throws InvalidBookingRequestException if bay not found.
    /// Throws ResourceCurrentlyOccupiedException if schedule conflict exists.
    Task ValidateAndCheckAvailabilityAsync(
        string serviceBayId,
        DateTimeOffset startUtc,
        DateTimeOffset endUtc,
        CancellationToken ct = default);
}
```

---

## New Application Service Implementations

Service implementations live in `Core/Application/Services/`.

### `TechnicianService : ITechnicianService`

Orchestrates:
1. `ITechnicianRepository.ExistsAsync` → `InvalidBookingRequestException` if false
2. `ITechnicianSkillRepository.HasSkillAsync` → `InvalidBookingRequestException` if false
3. `IAppointmentRepository.HasTechnicianOverlapAsync` → `ResourceCurrentlyOccupiedException` if true

### `BayService : IBayService`

Orchestrates:
1. `IServiceBayRepository.ExistsAsync` → `InvalidBookingRequestException` if false
2. `IAppointmentRepository.HasBayOverlapAsync` → `ResourceCurrentlyOccupiedException` if true

---

## New Domain Exceptions

### `ResourceCurrentlyOccupiedException` *(new in `Core/Domain/Exceptions/`)*

| Property | Value |
|---|---|
| Domain Code | `RESOURCE_CURRENTLY_OCCUPIED` |
| Message | `"Resource {id} is occupied for the requested timeslot [{start}, {end})"` |

### `InvalidBookingRequestException` *(new in `Core/Domain/Exceptions/`)*

| Property | Value |
|---|---|
| Domain Code | `INVALID_BOOKING_REQUEST` |
| Message | `"Booking request is invalid: {reason}"` |

---

## New Infrastructure Components

### `TenantBulkheadRouter` *(new singleton in `Infrastructure/Bulkhead/`)*

| Property | Description |
|---|---|
| Type | Singleton |
| Keying | `ConcurrentDictionary<string, (BoundedChannel<Func<Task>>, SemaphoreSlim)>` keyed by `tenantId` |
| Channel capacity | Configurable (default: 50 queued tasks per tenant) |
| Concurrency cap | Configurable (default: 5 concurrent per tenant) |
| Overflow policy | Channel full → do NOT acknowledge Redis message → redelivered on next poll |

### `AppointmentMessageValidator` *(new in `Core/Application/Validators/`)*

Required fields: `TenantId`, `TechnicianId`, `ServiceBayId`, `ServiceTypeId`, `VehicleId`, `CustomerId`, `DesiredStartTime`.

---

## State Transitions

```
                    ┌──────────┐
                    │ (Stream) │
                    └────┬─────┘
                         │ AppointmentMessage received
                         ▼
              ┌─── Validate (FluentValidation)
              │         │ invalid fields
              │         ▼ NACK
              │    InvalidBookingRequestException
              │
              │         │ valid
              │         ▼
              │    ITechnicianService.ValidateAndCheckAvailabilityAsync
              │         │ not found / incapable
              │         ▼ NACK
              │    InvalidBookingRequestException
              │         │ occupied
              │         ▼ NACK
              │    ResourceCurrentlyOccupiedException
              │
              │         │ technician OK
              │         ▼
              │    IBayService.ValidateAndCheckAvailabilityAsync
              │         │ not found
              │         ▼ NACK
              │    InvalidBookingRequestException
              │         │ occupied
              │         ▼ NACK
              │    ResourceCurrentlyOccupiedException
              │
              │         │ bay OK
              │         ▼
              │    Persist TrackingRecord (Status=Confirmed, times UTC)
              │    Update Redis cache
              │    ACK stream message
              └─────────────────────────────────────────────▶ Done
```
