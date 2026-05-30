# Implementation Plan: Appointment API Service — Ingestion Layer

**Branch**: `001-appointment-api-service` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-appointment-api-service/spec.md`

---

## Summary

Build `apps/appointment-api-service/` — a stateless, high-throughput Node.js + Express + TypeScript ingestion layer that:

1. Validates incoming appointment booking commands via Zod schemas.
2. Guards against duplicate submissions by checking for an existing `AppointmentHash` record in Redis (key: `tenant:{tenantId}:appointment:{vehicleId}`), which stores the full booking snapshot at intake.
3. Routes commands deterministically to one of 4 Redis Stream partitions via an FNV-1a consistent hash `f(tenantId, vehicleId) → partitionId`.
4. Publishes the compiled `AppointmentStreamMessage` to `appointments_stream_{partitionId}`.
5. Handles concurrent requests via Node.js `cluster` (one worker per CPU core).

Architecture strictly follows the Hexagonal (Ports & Adapters) pattern, multi-tenancy isolation via `AsyncLocalStorage`, and TDD (Red-Green-Refactor) mandated by the System Constitution v1.1.0 and all `.agents/rules/`.

---

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS

**Primary Dependencies**:
- `express` — HTTP server
- `ioredis` — Redis client (cache + streams)
- `zod` — HTTP boundary validation
- `uuid` — UUID v4 generation
- `jest` + `ts-jest` — unit test runner
- `supertest` — HTTP integration test helper
- `testcontainers` — Docker-based integration test infra

**Storage**: Redis only — no relational database in this service (stateless application layer)

**Testing**: Jest (`npm run test:unit` / `npm run test:integration`)

**Target Platform**: Linux container (Docker, multi-stage build); local macOS for development

**Project Type**: Microservice / HTTP API (ingestion-only, no persistence)

**Performance Goals**: 202 response < 200 ms p95 under normal load; 500 concurrent requests without blocking

**Constraints**: No direct DB access; no persistence logic; no worker logic; no authentication (upstream gateway handles it)

**Scale/Scope**: Single service with 4 stream partitions; N workers = CPU count per container

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design. All gates pass.*

| Principle | Check | Status |
|---|---|---|
| §I — Role Separation | Service is ingestion-only: validates → hash-check → hash-write → publish. No DB, no worker logic. | ✅ PASS |
| §II — Clean Architecture | Domain layer has zero external deps. Application layer defines Ports only. Infrastructure layer owns ioredis, Express. | ✅ PASS |
| §III — Multi-Tenancy | `tenant_id` validated at HTTP boundary (Zod). Propagated via `AsyncLocalStorage`. Cache key uses `tenant:{tenantId}:...` format. Stream message includes `tenantId`. | ✅ PASS |
| §IV — TDD | Unit tests written first (mocked `ICacheProvider`, `IMessagePublisher`). Integration tests via Docker Testcontainers. Zod at HTTP boundary. | ✅ PASS |
| §V — Contract-First | OpenAPI 3.1 and TypeScript shared types contracts defined in `contracts/` before implementation. | ✅ PASS |
| §VI — Monorepo + Docker | Service lives at `apps/appointment-api-service/`. Multi-stage `Dockerfile` required. Referenced in root `docker-compose.yml`. | ✅ PASS |
| **clean_architecture rule** | No SDK types leak from Infrastructure to Application/Domain. `RedisCacheAdapter` traps `ReplyError`/`AbortError` → `CacheUnavailableException`. | ✅ PASS |
| **multi_tenancy rule §2** | Cache key pattern: `tenant:{tenantId}:appointment:{vehicleId}` — matches required format. | ✅ PASS |
| **tdd rule §3** | Zod schemas enforce UUID format + future-date constraint at HTTP boundary. Domain models throw `DomainValidationException` on invariant violation. | ✅ PASS |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-appointment-api-service/
├── plan.md              ← This file
├── spec.md              ← Feature specification
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── openapi.yaml          ← HTTP API contract (OpenAPI 3.1)
│   └── appointment-types.ts  ← Shared TypeScript types (→ packages/shared-types)
├── checklists/
│   └── requirements.md
└── tasks.md             ← Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/appointment-api-service/
├── src/
│   ├── domain/                              ← ZERO external deps
│   │   ├── context/
│   │   │   └── tenant-context.ts            ← AsyncLocalStorage<{ tenantId: string }>
│   │   ├── exceptions/
│   │   │   ├── domain-validation.exception.ts
│   │   │   ├── duplicate-appointment.exception.ts
│   │   │   ├── cache-unavailable.exception.ts
│   │   │   └── stream-publish.exception.ts
│   │   ├── value-objects/
│   │   │   ├── command-id.ts                ← UUID v4 guard
│   │   │   ├── tenant-id.ts                 ← non-empty guard
│   │   │   ├── customer-id.ts
│   │   │   ├── vehicle-id.ts
│   │   │   ├── service-type-id.ts
│   │   │   ├── desired-time.ts              ← future-date guard
│   │   │   ├── partition-id.ts              ← [0,3] guard
│   │   │   └── appointment-source.ts        ← "admin" | "public" enum
│   │   └── utils/
│   │       └── partition-hasher.ts          ← FNV-1a 32-bit, pure function
│   │
│   ├── application/                         ← Port interfaces + Use Cases only
│   │   ├── commands/
│   │   │   └── create-appointment.command.ts ← Zod schema + inferred DTO type
│   │   ├── ports/
│   │   │   ├── cache-provider.port.ts        ← ICacheProvider { exists, hset, ping, del }
│   │   │   └── message-publisher.port.ts     ← IMessagePublisher { publish }
│   │   └── use-cases/
│   │       ├── create-appointment.use-case.ts ← orchestrates hash-check → hash-write → publish
│   │       └── health-check.use-case.ts
│   │
│   └── infrastructure/                      ← Concrete adapters + HTTP layer
│       ├── cache/
│       │   └── redis-cache.adapter.ts        ← ICacheProvider via ioredis
│       ├── messaging/
│       │   └── redis-stream.publisher.ts     ← IMessagePublisher via ioredis XADD
│       ├── di/
│       │   └── container.ts                  ← Composition root: bind ports → adapters
│       └── http/
│           ├── cluster.ts                    ← Entry point: Node.js cluster fork
│           ├── server.ts                     ← Express app factory
│           ├── middleware/
│           │   ├── tenant-context.middleware.ts  ← populates AsyncLocalStorage
│           │   └── error-handler.middleware.ts   ← maps domain exceptions → HTTP codes
│           └── routes/
│               ├── appointment.routes.ts
│               └── health.routes.ts
│
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   │   ├── partition-hasher.test.ts          ← determinism + distribution (1000 pairs)
│   │   │   └── value-objects/desired-time.test.ts ← past/future boundary
│   │   └── application/
│   │       ├── create-appointment.use-case.test.ts ← happy path, 409, 400, 503
│   │       └── health-check.use-case.test.ts
│   └── integration/
│       ├── redis-cache.adapter.test.ts            ← real Redis via Testcontainers
│       ├── redis-stream.publisher.test.ts
│       └── appointment.e2e.test.ts                ← full POST flow end-to-end
│
├── Dockerfile                                     ← Multi-stage (builder + runtime)
├── package.json
├── tsconfig.json
└── .env.example
```

**Structure Decision**: Single-service structure (Option 1) rooted at `apps/appointment-api-service/`, following the Constitution §VI monorepo layout. Tests are co-located under `tests/` with clear `unit/` and `integration/` separation.

---

## Implementation Phases

### Phase 1 — Foundation & Domain (TDD: Red first)

**Goal**: Scaffold the project, write all failing unit tests, implement the Domain layer.

#### 1.1 Project Scaffold
- Initialise `apps/appointment-api-service/` with `package.json`, `tsconfig.json`, `.env.example`.
- Install runtime deps: `express`, `ioredis`, `zod`, `uuid`.
- Install dev deps: `typescript`, `ts-node-dev`, `jest`, `ts-jest`, `supertest`, `testcontainers`, `@types/*`.
- Add npm scripts: `dev`, `build`, `start`, `test:unit`, `test:integration`, `lint`.

#### 1.2 Domain Layer (zero dependencies)
- `tenant-context.ts` — `AsyncLocalStorage<{ tenantId: string }>` singleton export.
- All 4 exception classes with descriptive messages.
- All 8 Value Object classes with invariant guards throwing `DomainValidationException`.
- `partition-hasher.ts` — FNV-1a 32-bit implementation. **Write tests first** (determinism, [0,3] range, 1000-pair distribution ≤30% on any partition).

#### 1.3 Unit Tests — Domain (Red phase)
- `partition-hasher.test.ts` — written before implementation.
- `desired-time.test.ts` — past datetime rejected, future accepted, exactly-now edge case.

---

### Phase 2 — Application Layer (Use Cases + Ports)

**Goal**: Define Port interfaces, write use case unit tests with mocked ports, implement use cases.

#### 2.1 Port Interfaces
- `ICacheProvider` — `exists`, `hset`, `hgetall`, `del`, `ping`.
- `IMessagePublisher` — `publish(streamName, fields): Promise<string>`.

#### 2.2 Unit Tests — Use Cases (Red phase, mocked ports)
- `create-appointment.use-case.test.ts`:
  - Happy path: hash absent → hset called → publish called → returns `{ commandId, partitionId }`.
  - Duplicate: hash exists → throws `DuplicateAppointmentException` → no publish.
  - Cache error: `ICacheProvider.exists` throws → `CacheUnavailableException` propagates.
  - Stream error: `IMessagePublisher.publish` throws → `StreamPublishException` propagates.
- `health-check.use-case.test.ts`:
  - Redis healthy → `{ healthy: true }`.
  - Redis unhealthy → `{ healthy: false }`.

#### 2.3 Zod Validation Schema
- `create-appointment.command.ts` — all fields UUID, `desired_start_time` ISO future.

#### 2.4 Use Case Implementations (Green phase)
- `CreateAppointmentUseCase` — implements the 7-step flow from `data-model.md §2.2`.
- `HealthCheckUseCase` — calls `cacheProvider.ping()`.

---

### Phase 3 — Infrastructure Layer (Adapters + HTTP)

**Goal**: Implement concrete adapters, Express routing, cluster entry point.

#### 3.1 Redis Adapters
- `RedisCacheAdapter` — implements `ICacheProvider` via `ioredis`. Traps `ReplyError`/`AbortError` → `CacheUnavailableException`.
- `RedisStreamPublisher` — implements `IMessagePublisher` via `ioredis XADD`. Traps errors → `StreamPublishException`.

#### 3.2 Integration Tests (Testcontainers, Red first)
- `redis-cache.adapter.test.ts` — spin up Redis container; test `exists` (false→true after hset), `hgetall`, `del`, `ping`.
- `redis-stream.publisher.test.ts` — spin up Redis container; verify `XRANGE appointments_stream_N - +` returns the published message.

#### 3.3 Composition Root
- `container.ts` — binds `ICacheProvider → RedisCacheAdapter`, `IMessagePublisher → RedisStreamPublisher`, initialises `ioredis` client from `REDIS_URL` env var.

#### 3.4 Express App + Middleware
- `tenant-context.middleware.ts` — reads `tenantId` from validated body; runs `AsyncLocalStorage.run({ tenantId }, next)`.
- `error-handler.middleware.ts` — maps domain exceptions to HTTP codes:
  - `DomainValidationException` → 400
  - `DuplicateAppointmentException` → 409
  - `CacheUnavailableException` | `StreamPublishException` → 503
  - Unknown → 500
- `appointment.routes.ts` — `POST /api/v1/appointments` → validate (Zod) → middleware → use case.
- `health.routes.ts` — `GET /health` → use case → 200/503.
- `server.ts` — Express app factory wiring middleware + routes.

#### 3.5 Cluster Entry Point
- `cluster.ts` — primary process forks `os.cpus().length` workers, each running `server.ts`. Handles worker exit with respawn.

#### 3.6 E2E Integration Test
- `appointment.e2e.test.ts` — spin up Redis container; boot Express app; full `POST /api/v1/appointments` happy path → verify Redis hash → verify stream message. Then duplicate request → verify 409.

---

### Phase 4 — Docker & Configuration

**Goal**: Containerise the service and wire it into `docker-compose.yml`.

#### 4.1 Dockerfile (multi-stage, Constitution §VI)
```dockerfile
# Stage 1: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "dist/infrastructure/http/cluster.js"]
```

No secrets, no credentials in the image.

#### 4.2 Root `docker-compose.yml` (update / create)
- Add `appointment-api-service` service block:
  - `build.context: ./apps/appointment-api-service`
  - `ports: ["3000:3000"]`
  - `environment: [REDIS_URL=redis://redis:6379, STREAM_PARTITION_COUNT=4]`
  - `depends_on: { redis: { condition: service_healthy } }`
- Add/verify `redis` service with health check (`redis-cli ping`).

---

## Complexity Tracking

No Constitution violations. No complexity exceptions required.

---

## Research & Design Artifacts

| Artifact | Location | Phase |
|---|---|---|
| Research (all unknowns resolved) | [research.md](./research.md) | 0 |
| Data model, entities, ports, concurrency | [data-model.md](./data-model.md) | 1 |
| OpenAPI 3.1 contract | [contracts/openapi.yaml](./contracts/openapi.yaml) | 1 |
| TypeScript shared types | [contracts/appointment-types.ts](./contracts/appointment-types.ts) | 1 |
| Developer quickstart | [quickstart.md](./quickstart.md) | 1 |
