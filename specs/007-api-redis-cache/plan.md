# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement a read-through Redis cache strategy for all general entities, storing them as Redis Hashes with appropriate TTLs. The Redis Hash schema must match the database schema exactly, but also include fully denormalized representations of any associated relationships (e.g., storing the full technician and bay objects alongside their IDs in the appointment hash). In addition, restrict appointment statuses to four distinct states and enforce custom TTL caching logic for appointments (Completed/Cancelled expire in 6 hours, while Scheduled/InProgress remain cached). Updates and deletes via API will synchronously update the cache, and the C# worker service will also update the cache when creating/updating appointments asynchronously.

## Technical Context

**Language/Version**: Node.js v20 (API), C# .NET 8 (Worker)

**Primary Dependencies**: `ioredis`, `zod` (API) | `StackExchange.Redis`, `FluentValidation` (Worker)

**Storage**: PostgreSQL 15, Redis 7

**Testing**: Jest (API), xUnit + Testcontainers (Worker)

**Target Platform**: Docker (Linux)

**Project Type**: Microservices (Monorepo)

**Performance Goals**: Reduce database read operations by at least 80%

**Constraints**: Strict Hexagonal Architecture layer separation and Multi-tenant data isolation.

**Scale/Scope**: High-throughput read endpoints, frequent updates via streams.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Hexagonal Architecture**: Yes, cache adapters will be in Infrastructure, Ports in Application.
- **Tenant Isolation**: Yes, Redis keys will include `tenant_id`.
- **Docker**: Yes, already standard.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/
├── appointment-api-service/
│   ├── src/
│   │   ├── application/
│   │   │   └── ports/          # ICacheProvider interface
│   │   └── infrastructure/
│   │       └── redis/          # ICacheProvider implementation
└── appointment-worker-service/
    ├── src/
    │   ├── Core/Application/   # ICacheProvider interface
    │   └── Infrastructure/
    │       └── Redis/          # ICacheProvider implementation
```

**Structure Decision**: Code will be placed within the existing `appointment-api-service` and `appointment-worker-service` directories according to Hexagonal Architecture, with interfaces in Application layer and implementation in Infrastructure layer.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
