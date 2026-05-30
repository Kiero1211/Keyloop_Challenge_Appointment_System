# Quickstart: Appointment API Service — Local Development

**Branch**: `001-appointment-api-service` | **Date**: 2026-05-30

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 20 LTS | Runtime |
| npm | ≥ 10 | Package manager |
| Docker + Docker Compose | ≥ 24 | Redis + full system boot |
| TypeScript | 5.x (devDep) | Compilation |

---

## Directory Location

```
apps/appointment-api-service/    ← all source code lives here
```

Inside the monorepo root at `/Users/kiero/Desktop/Code/Keyloop/`.

---

## Source Layout (Constitution §VI)

```
apps/appointment-api-service/
├── src/
│   ├── domain/
│   │   ├── context/
│   │   │   └── tenant-context.ts            ← AsyncLocalStorage store
│   │   ├── exceptions/
│   │   │   ├── domain-validation.exception.ts
│   │   │   ├── duplicate-appointment.exception.ts
│   │   │   ├── cache-unavailable.exception.ts
│   │   │   └── stream-publish.exception.ts
│   │   ├── value-objects/
│   │   │   ├── command-id.ts
│   │   │   ├── tenant-id.ts
│   │   │   ├── customer-id.ts
│   │   │   ├── vehicle-id.ts
│   │   │   ├── service-type-id.ts
│   │   │   ├── desired-time.ts
│   │   │   ├── partition-id.ts
│   │   │   └── appointment-source.ts
│   │   └── utils/
│   │       └── partition-hasher.ts          ← FNV-1a hashing function
│   │
│   ├── application/
│   │   ├── commands/
│   │   │   └── create-appointment.command.ts ← Zod schema + inferred types
│   │   ├── ports/
│   │   │   ├── cache-provider.port.ts        ← ICacheProvider interface
│   │   │   └── message-publisher.port.ts     ← IMessagePublisher interface
│   │   └── use-cases/
│   │       ├── create-appointment.use-case.ts
│   │       └── health-check.use-case.ts
│   │
│   └── infrastructure/
│       ├── cache/
│       │   └── redis-cache.adapter.ts        ← ICacheProvider (ioredis)
│       ├── messaging/
│       │   └── redis-stream.publisher.ts     ← IMessagePublisher (ioredis xadd)
│       ├── di/
│       │   └── container.ts                  ← Composition root / DI bindings
│       └── http/
│           ├── cluster.ts                    ← Entry point (Node.js cluster fork)
│           ├── server.ts                     ← Express app factory
│           ├── middleware/
│           │   ├── tenant-context.middleware.ts
│           │   └── error-handler.middleware.ts
│           └── routes/
│               ├── appointment.routes.ts
│               └── health.routes.ts
│
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   │   ├── partition-hasher.test.ts
│   │   │   └── value-objects/
│   │   │       └── desired-time.test.ts
│   │   └── application/
│   │       ├── create-appointment.use-case.test.ts
│   │       └── health-check.use-case.test.ts
│   └── integration/
│       ├── redis-cache.adapter.test.ts
│       ├── redis-stream.publisher.test.ts
│       └── appointment.e2e.test.ts
│
├── Dockerfile                               ← Multi-stage build (REQUIRED §VI)
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Environment Variables

```bash
# .env.example
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
STREAM_PARTITION_COUNT=4
```

No secrets are baked into the image. All configuration is injected at runtime.

---

## Running Locally (standalone)

```bash
# From repo root
cd apps/appointment-api-service

# Install dependencies
npm install

# Start Redis (if not using docker-compose)
docker run -d -p 6379:6379 redis:7-alpine

# Run in development mode (ts-node-dev, single process)
npm run dev

# Run tests
npm run test:unit       # Jest, mocked ports
npm run test:integration # Jest + Testcontainers (requires Docker)

# Build TypeScript
npm run build

# Run compiled (cluster mode)
npm start
```

---

## Running Full System (docker-compose)

```bash
# From repo root — boots all services + Redis + PostgreSQL
docker compose up
```

The API service is reachable at `http://localhost:3000`.

---

## Quick Smoke Test

```bash
# Health check
curl http://localhost:3000/health

# Submit appointment
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "customer_id": "a17c9aaa-bbb0-4c3d-b5b3-80f0a5e2e2a1",
    "vehicle_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "service_type_id": "c1e9e2a0-1234-4567-89ab-cdef01234567",
    "desired_start_time": "2026-06-15T09:00:00.000Z"
  }'
# Expected: 202 { commandId: "...", partitionId: N }

# Duplicate — should return 409
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{ ...same payload... }'
# Expected: 409 { error: "Appointment already pending", vehicleId: "..." }

# Verify appointment hash in Redis
redis-cli HGETALL "tenant:d290f1ee-6c54-4b01-90e6-d701748f0851:appointment:f47ac10b-58cc-4372-a567-0e02b2c3d479"

# Verify stream message
redis-cli XRANGE appointments_stream_N - +
```
