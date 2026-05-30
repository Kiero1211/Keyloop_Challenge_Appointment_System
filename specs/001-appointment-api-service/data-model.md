# Data Model: Appointment API Service — Ingestion Layer

**Phase**: 1 | **Branch**: `001-appointment-api-service` | **Date**: 2026-05-30

---

## 1. Domain Entities & Value Objects

Location: `apps/appointment-api-service/src/domain/`

### 1.1 `AppointmentCommand` (Value Object)

Represents the validated, enriched command that the use case publishes to the Redis Stream. It is the domain's canonical record of intent for a booking request.

```
AppointmentCommand
├── commandId: CommandId             ← UUID v4 Value Object — generated at intake
├── tenantId: TenantId               ← non-empty string Value Object
├── customerId: CustomerId           ← UUID string Value Object
├── vehicleId: VehicleId             ← UUID string Value Object
├── serviceTypeId: ServiceTypeId     ← UUID string Value Object
├── desiredStartTime: DesiredTime    ← future ISO 8601 datetime Value Object
├── source: AppointmentSource        ← "admin" | "public" enum
├── partitionId: PartitionId         ← integer 0–3 Value Object
└── timestamp: Timestamp             ← server-side intake UTC ISO 8601
```

**Invariants** (all enforced in the Value Object constructors — `DomainValidationException` thrown on violation):
- `commandId` must be a valid UUID v4.
- `tenantId` must be non-empty.
- `customerId`, `vehicleId`, `serviceTypeId` must be non-empty strings.
- `desiredStartTime` must be a datetime strictly in the future relative to server clock.
- `partitionId` must be an integer in `[0, 3]`.

---

### 1.2 `AppointmentHash` (Domain Entity — Redis projection)

Represents the full appointment snapshot stored in Redis at intake time. It is a read/write projection of the `AppointmentCommand` enriched with as-yet-unknown fields that the worker will populate later.

```
AppointmentHash
├── commandId: string                ← from AppointmentCommand
├── tenantId: string                 ← from AppointmentCommand
├── customerId: string               ← from AppointmentCommand
├── vehicleId: string                ← from AppointmentCommand
├── serviceTypeId: string            ← from AppointmentCommand
├── desiredStartTime: string         ← ISO 8601, from AppointmentCommand
├── source: string                   ← "admin"
├── timestamp: string                ← ISO 8601 intake timestamp
├── partitionId: number              ← 0–3
├── technicianId?: string | null     ← absent at intake; set by worker
├── bayId?: string | null            ← absent at intake; set by worker
└── workshopId?: string | null       ← absent at intake; set by worker
```

**Cache key**: `tenant:{tenantId}:appointment:{vehicleId}`

**Lifecycle**:
1. Written by `appointment-api-service` on successful command intake.
2. Existence check by `appointment-api-service` to gate duplicate submissions.
3. Worker updates `technicianId`, `bayId`, `workshopId` fields when resolved.
4. Worker deletes the key when the booking reaches a terminal state.

**No TTL** — persists until explicitly deleted by the worker.

---

### 1.3 Value Objects

| Value Object | Location | Invariant |
|---|---|---|
| `CommandId` | `domain/value-objects/command-id.ts` | Valid UUID v4 |
| `TenantId` | `domain/value-objects/tenant-id.ts` | Non-empty string |
| `CustomerId` | `domain/value-objects/customer-id.ts` | Non-empty string |
| `VehicleId` | `domain/value-objects/vehicle-id.ts` | Non-empty string |
| `ServiceTypeId` | `domain/value-objects/service-type-id.ts` | Non-empty string |
| `DesiredTime` | `domain/value-objects/desired-time.ts` | ISO 8601, strictly future |
| `PartitionId` | `domain/value-objects/partition-id.ts` | Integer in [0, 3] |
| `AppointmentSource` | `domain/value-objects/appointment-source.ts` | Enum: "admin" \| "public" |

---

### 1.4 Domain Exceptions

| Exception | Trigger |
|---|---|
| `DomainValidationException` | Any Value Object invariant violated |
| `DuplicateAppointmentException` | Appointment hash exists for vehicle; maps to HTTP 409 |
| `CacheUnavailableException` | Redis unreachable; maps to HTTP 503 |
| `StreamPublishException` | Redis Stream write failure; maps to HTTP 503 |

---

## 2. Application Layer — Ports & Use Case

Location: `apps/appointment-api-service/src/application/`

### 2.1 Port Interfaces

```typescript
// src/application/ports/cache-provider.port.ts
interface ICacheProvider {
  exists(key: string): Promise<boolean>;
  hset(key: string, fields: Record<string, string>): Promise<void>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  del(key: string): Promise<void>;
  ping(): Promise<boolean>;
}

// src/application/ports/message-publisher.port.ts
interface IMessagePublisher {
  publish(streamName: string, payload: Record<string, string>): Promise<string>; // returns stream entry ID
}
```

### 2.2 `CreateAppointmentUseCase`

```
CreateAppointmentUseCase(cacheProvider: ICacheProvider, messagePublisher: IMessagePublisher)
  .execute(command: CreateAppointmentInput): Promise<CreateAppointmentResult>

Input:
  tenantId, customerId, vehicleId, serviceTypeId, desiredStartTime

Steps:
  1. Build Value Objects → throws DomainValidationException if invalid
  2. Compute partitionId = PartitionHasher.hash(tenantId, vehicleId)
  3. Generate commandId = uuid()
  4. cacheProvider.exists(`tenant:{tenantId}:appointment:{vehicleId}`)
     → throws DuplicateAppointmentException if true
  5. cacheProvider.hset(key, appointmentHashFields)
  6. messagePublisher.publish(`appointments_stream_{partitionId}`, commandPayload)
  7. Return { commandId, partitionId }
```

### 2.3 `HealthCheckUseCase`

```
HealthCheckUseCase(cacheProvider: ICacheProvider)
  .execute(): Promise<{ healthy: boolean }>

Steps:
  1. cacheProvider.ping() → returns true/false
```

---

## 3. Infrastructure Adapters

Location: `apps/appointment-api-service/src/infrastructure/`

### 3.1 `RedisCacheAdapter` implements `ICacheProvider`

- Uses `ioredis` client internally.
- Catches `ReplyError`, `AbortError` → re-throws `CacheUnavailableException`.
- Registered at composition root in `src/infrastructure/di/container.ts`.

### 3.2 `RedisStreamPublisher` implements `IMessagePublisher`

- Calls `redis.xadd(streamName, '*', ...fieldValuePairs)`.
- Catches ioredis errors → re-throws `StreamPublishException`.

### 3.3 Express HTTP Controllers

| Route | Controller | Use Case |
|---|---|---|
| `POST /api/v1/appointments` | `AppointmentController` | `CreateAppointmentUseCase` |
| `GET /health` | `HealthController` | `HealthCheckUseCase` |

**Controller responsibilities** (and only these):
1. Parse + validate HTTP request body via Zod schema.
2. Extract `tenantId` from validated payload; run `TenantContextMiddleware` to store in `AsyncLocalStorage`.
3. Call use case.
4. Map domain result/exception to HTTP response code.

### 3.4 Validation Schema (Zod)

```typescript
// src/application/commands/create-appointment.command.ts
const CreateAppointmentSchema = z.object({
  tenant_id:         z.string().uuid(),
  customer_id:       z.string().uuid(),
  vehicle_id:        z.string().uuid(),
  service_type_id:   z.string().uuid(),
  desired_start_time: z.string().datetime().refine(
    v => new Date(v) > new Date(),
    { message: 'desired_start_time must be in the future' }
  ),
});
```

---

## 4. Partition Hashing Algorithm

Location: `apps/appointment-api-service/src/domain/utils/partition-hasher.ts`

**Algorithm: FNV-1a 32-bit**

```
Input:  tenantId: string, vehicleId: string, N: number = 4
Key:    `${tenantId}:${vehicleId}`
Step 1: hash = FNV_OFFSET_BASIS (2166136261)
Step 2: for each byte b in UTF-8(key):
          hash ^= b
          hash = (hash * FNV_PRIME) >>> 0   // 32-bit truncation
Step 3: return Math.abs(hash) % N
Output: integer in [0, N-1]
```

**Properties**:
- Zero npm dependencies.
- Deterministic across all instances and restarts.
- Uniform distribution over UUID-shaped inputs (verified in unit tests with 1000-pair sample).

---

## 5. Concurrency Model

```
Docker Container
└── cluster.ts (entry point)
    ├── Primary process: forks os.cpus().length worker processes
    └── Worker 0..N-1
        └── Express app (server.ts)
            ├── ioredis client (owns its own connection pool per worker)
            └── AsyncLocalStorage (per-request scoped context)
```

**Request lifecycle (per worker)**:
1. Request arrives at Express.
2. `TenantContextMiddleware` validates `tenant_id` from body; stores in `AsyncLocalStorage`.
3. `AppointmentController` calls Zod validator → use case.
4. Use case calls `ICacheProvider` (async, non-blocking) → `IMessagePublisher` (async, non-blocking).
5. Response sent.

No blocking I/O; all Redis calls are async awaited. Workers do not share in-process state.

---

## 6. State Machine

The API service only creates one state in the lifecycle — "pending intake". The full appointment state machine lives in the worker service.

```
[no hash exists] ──POST /appointments──► [hash written + command published]
                                                      │
                                           (any duplicate request)
                                                      │
                                               409 Conflict
                                           (worker deletes hash on completion)
                                                      │
                                         [no hash exists] ← ready for new booking
```
