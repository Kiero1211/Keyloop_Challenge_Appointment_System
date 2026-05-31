# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement a 5-minute temporary slot hold mechanism for technician and service bay combinations when a user initiates an appointment booking. This prevents concurrent double-bookings. The API service will track the temporary hold (likely via Redis). Unconfirmed holds must expire automatically after 5 minutes. The API must also drop the previous vehicle idempotency check so multiple appointments can be booked for the same vehicle.

## Technical Context

**Language/Version**: Node.js (TypeScript) for API Service, C# .NET 8 for Worker Service

**Primary Dependencies**: ioredis, Zod (API Service); EF Core, StackExchange.Redis, FluentValidation (Worker Service)

**Storage**: Redis (for temporary hold caches), PostgreSQL (for permanent appointments)

**Testing**: Jest (API), xUnit (Worker)

**Target Platform**: Linux containers (Docker)

**Project Type**: Monorepo with Express API and .NET Background Worker

**Performance Goals**: High-throughput ingestion (API), correct concurrency handling (Worker)

**Constraints**: Strict multi-tenancy data isolation (tenant_id), Hexagonal Architecture boundaries

**Scale/Scope**: Holds exist for exactly 5 minutes. Must reliably expire to prevent lockups.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Hexagonal Microservice Architecture**: The hold caching logic will live in the API service since it's pre-booking validation, and the worker will continue processing confirmed stream messages. No boundaries violated.
- [x] **II. Clean Architecture**: Hold logic in API will be implemented via an application-layer Use Case and a Redis Cache Port/Adapter in the Infrastructure layer.
- [x] **III. Multi-Tenancy**: All Redis keys for temporary holds MUST include `tenant_id` (e.g. `tenant:{tenant_id}:hold:technician:{tech_id}` and `tenant:{tenant_id}:hold:bay:{bay_id}`).
- [x] **IV. Spec-Driven & TDD**: Required tests for holding slots and removing vehicle idempotency will be outlined.
- [x] **V. Executive Command Protocol**: Contracts defined first (data model).
- [x] **VI. Monorepo & Docker**: No structural repository changes required.

## Project Structure

### Documentation (this feature)

```text
specs/005-temporary-slot-hold/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/appointment-api-service/
├── src/
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── create-appointment.use-case.ts
│   │   │   └── create-hold.use-case.ts
│   │   └── ports/
│   │       └── cache.provider.ts
│   ├── domain/
│   │   └── entities/
│   │       └── temporary-hold.ts
│   └── infrastructure/
│       ├── cache/
│       │   └── redis-cache.provider.ts
│       └── http/
│           └── routes/
│               └── appointment.routes.ts
└── tests/
    └── integration/
        └── appointment.e2e.test.ts
```

**Structure Decision**: The primary implementation of the temporary hold will be situated in the `apps/appointment-api-service` (Node.js API). We will add a new endpoint/use-case for creating the hold and modify the existing `create-appointment.use-case.ts` to validate the hold and remove vehicle idempotency.
