# Implementation Plan: multi-tenant-api

**Branch**: `003-multi-tenant-api` | **Date**: 2026-05-30 | **Spec**: [spec.md](file:///Users/kiero/Desktop/Code/Keyloop/specs/003-multi-tenant-api/spec.md)

**Input**: Feature specification from `/specs/003-multi-tenant-api/spec.md`

## Summary

Add a complete multi-tenant REST API layer to the existing `appointment-api-service` (Node.js + Express + TypeScript), plus a new `auth-service` stub within the same monorepo. The feature delivers:

1. **Auth endpoints** (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/switch-tenant`, `/auth/tenants`) with access + refresh JWT token pair, server-side revocable refresh tokens, and `isSuperAdmin` bypass.
2. **JWT authentication middleware** added to the existing `appointment-api-service` (currently missing from the appointment route — the `x-tenant-id` header is already read and stored via `AsyncLocalStorage`, but no JWT is verified).
3. **Full CRUD REST API** for the 8 domain entities (Tenant, Customer, Vehicle, ServiceType, Technician, TechnicianSkill, ServiceBay, Appointment) all scoped via the `x-tenant-id` header validated against the JWT `tenant_id` claim.
4. **`appointment-api-service` stays as the ingestion + CRUD gateway** — the worker service remains purely a background consumer (no HTTP exposure added).

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: Express 4, Zod (validation — already in use), `jsonwebtoken` (JWT sign/verify), `bcryptjs` (password hashing), `ioredis` (already in use), Typeorm or Prisma for PostgreSQL CRUD (new — Drizzle or Typeorm to match constitution's "EF Core" analogy for Node.js)

**Storage**: PostgreSQL (new — for persistent CRUD entities: Users, Tenants, Customers, Vehicles, ServiceTypes, Technicians, TechnicianSkills, ServiceBays, Appointments, RefreshTokens) + Redis (existing — idempotency, caching)

**Testing**: Jest + Supertest (HTTP integration tests), Testcontainers (PostgreSQL, Redis)

**Target Platform**: Linux Docker container (monorepo, `docker-compose.yml`)

**Project Type**: HTTP REST API service (existing `appointment-api-service` extended)

**Performance Goals**: ≥200 concurrent booking requests per tenant at p95 ≤500 ms

**Constraints**: Strict Hexagonal Architecture layer boundaries; no infrastructure imports in Domain/Application; `tenant_id` propagated via `AsyncLocalStorage` (no parameter drilling); all data-access queries include `tenant_id` filter

**Scale/Scope**: 8 CRUD entities × full CRUD = ~40 endpoints; 6 auth endpoints; ~46 total routes

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Hexagonal Microservice Architecture & Role Separation**: All new CRUD endpoints and auth endpoints are added to `apps/appointment-api-service/` acting as the HTTP gateway. The worker service (`appointment-worker-service`) is untouched and remains a background consumer only. No HTTP is added to the worker.
- [x] **II. Clean Architecture boundaries**: New domain entities live in `src/domain/`; repository port interfaces live in `src/application/ports/`; Drizzle/TypeORM adapters live in `src/infrastructure/db/`. JWT middleware is an infrastructure adapter. No infrastructure dependency imported into Domain or Application layers.
- [x] **III. Multi-Tenancy & Data Isolation**: `x-tenant-id` header is already read via `tenantContextMiddleware` into `AsyncLocalStorage`. New JWT middleware will add a cross-check: `tenant_id` JWT claim must equal the `x-tenant-id` header value. All new ORM queries apply a `WHERE tenant_id = ?` filter derived from `AsyncLocalStorage`.
- [x] **IV. Spec-Driven & TDD**: All new use cases will have unit tests (mocked ports) written before implementation; CRUD integration tests via Testcontainers.
- [x] **V. Executive Command Execution Protocol**: OpenAPI contract (`openapi.yaml`) written in Phase 1 before any controller code.
- [x] **VI. Monorepo & Docker**: All code stays within `apps/appointment-api-service/`. PostgreSQL service added to root `docker-compose.yml`.

**⚠ Authorization gap found in existing code (FR-031 note)**: The existing `POST /api/v1/appointments` route applies `tenantContextMiddleware` (reads `x-tenant-id` into `AsyncLocalStorage`) but has **no JWT authentication middleware**. This means the double-booking detection requirement (FR-031) is correctly implemented in the use case, but the route is publicly callable without a valid JWT. The JWT middleware added in this plan will close that gap.

---

## Execution Strategy (TDD)

To strictly adhere to Constitution Principle IV (Spec-Driven & Test-Driven Development), the implementation phases must follow this TDD cycle:

1. **Test First (Red)**: Write unit tests for use cases and integration tests for repository/HTTP adapters *before* writing the implementation code. Ensure they fail.
2. **Implement (Green)**: Write the minimal implementation code in the domain, application, and infrastructure layers to make the tests pass.
3. **Refactor**: Clean up the code while keeping the tests green.

No production code should be written without a failing test preceding it.

## Project Structure

### Documentation (this feature)

```text
specs/003-multi-tenant-api/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── openapi.yaml     ← Phase 1 output
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/appointment-api-service/
├── src/
│   ├── domain/
│   │   ├── context/
│   │   │   └── tenant-context.ts               ← existing (AsyncLocalStorage)
│   │   ├── entities/                           ← NEW: domain entities (plain objects, no ORM deps)
│   │   │   ├── user.entity.ts
│   │   │   ├── tenant.entity.ts
│   │   │   ├── customer.entity.ts
│   │   │   ├── vehicle.entity.ts
│   │   │   ├── service-type.entity.ts
│   │   │   ├── technician.entity.ts
│   │   │   ├── technician-skill.entity.ts
│   │   │   ├── service-bay.entity.ts
│   │   │   ├── appointment.entity.ts
│   │   │   └── refresh-token.entity.ts
│   │   ├── exceptions/                         ← existing + new exception types
│   │   ├── value-objects/                      ← existing
│   │   └── utils/                              ← existing
│   ├── application/
│   │   ├── commands/                           ← existing + new CRUD commands
│   │   ├── ports/
│   │   │   ├── cache-provider.port.ts          ← existing
│   │   │   ├── message-publisher.port.ts       ← existing
│   │   │   └── repositories/                   ← NEW: one interface per entity
│   │   │       ├── user.repository.port.ts
│   │   │       ├── tenant.repository.port.ts
│   │   │       ├── customer.repository.port.ts
│   │   │       ├── vehicle.repository.port.ts
│   │   │       ├── service-type.repository.port.ts
│   │   │       ├── technician.repository.port.ts
│   │   │       ├── technician-skill.repository.port.ts
│   │   │       ├── service-bay.repository.port.ts
│   │   │       ├── appointment.repository.port.ts
│   │   │       └── refresh-token.repository.port.ts
│   │   └── use-cases/
│   │       ├── create-appointment.use-case.ts  ← existing
│   │       ├── health-check.use-case.ts        ← existing
│   │       └── auth/                           ← NEW
│   │           ├── register.use-case.ts
│   │           ├── login.use-case.ts
│   │           ├── refresh-token.use-case.ts
│   │           ├── logout.use-case.ts
│   │           └── switch-tenant.use-case.ts
│   │       └── crud/                           ← NEW (one per entity × CRUD)
│   │           ├── tenant/
│   │           ├── customer/
│   │           ├── vehicle/
│   │           ├── service-type/
│   │           ├── technician/
│   │           ├── technician-skill/
│   │           ├── service-bay/
│   │           └── appointment/
│   └── infrastructure/
│       ├── cache/                              ← existing
│       ├── db/                                 ← NEW: Drizzle ORM adapters
│       │   ├── schema.ts                       ← Drizzle table definitions
│       │   ├── client.ts                       ← pg connection pool
│       │   └── repositories/                   ← concrete adapter per entity
│       ├── di/
│       │   └── container.ts                    ← existing (extended with new deps)
│       ├── http/
│       │   ├── app.ts                          ← existing (updated with new routes)
│       │   ├── middleware/
│       │   │   ├── error-handler.middleware.ts ← existing (extended)
│       │   │   ├── tenant-context.middleware.ts← existing
│       │   │   └── jwt-auth.middleware.ts      ← NEW
│       │   └── routes/
│       │       ├── appointment.routes.ts       ← existing (JWT middleware added)
│       │       ├── health.routes.ts            ← existing
│       │       ├── auth.routes.ts              ← NEW
│       │       ├── tenant.routes.ts            ← NEW
│       │       ├── customer.routes.ts          ← NEW
│       │       ├── vehicle.routes.ts           ← NEW
│       │       ├── service-type.routes.ts      ← NEW
│       │       ├── technician.routes.ts        ← NEW
│       │       ├── technician-skill.routes.ts  ← NEW
│       │       ├── service-bay.routes.ts       ← NEW
│       │       └── appointment-crud.routes.ts  ← NEW (CRUD read/update/cancel)
│       └── messaging/                          ← existing
├── tests/
│   ├── unit/
│   │   ├── application/                        ← existing
│   │   └── auth/                               ← NEW
│   └── integration/                            ← NEW: Testcontainers
└── Dockerfile                                  ← existing
```

**Structure Decision**: All new code extends the existing `apps/appointment-api-service/` hexagonal structure. No new service is created; the constitution already designates this service as the HTTP gateway.

---

## Complexity Tracking

> No constitution violations. All additions fit within the established service role and layer boundaries.

