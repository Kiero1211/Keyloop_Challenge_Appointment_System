# Implementation Plan: API Caching and Small Fixes

**Branch**: `main` | **Date**: 2026-06-02 | **Spec**: [specs/011-api-caching-fixes/spec.md](file:///Users/kiero/Desktop/Code/Keyloop/specs/011-api-caching-fixes/spec.md)

**Input**: Feature specification from `/specs/011-api-caching-fixes/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement failed appointment tracking (in DB via worker), automatic database initialization (via API `main.ts`), Redis Set/Hash caching for list endpoints, and update the OpenAPI spec to reflect code reality.

## Technical Context

**Language/Version**: Node.js, TypeScript, C# .NET 8

**Primary Dependencies**: Express, Drizzle, Zod, Redis (ioredis), Entity Framework Core

**Storage**: PostgreSQL (Primary DB), Redis (Cache & Message Bus)

**Testing**: Jest (Node.js), .NET Test (xUnit/NUnit)

**Target Platform**: Linux (Docker containers)

**Project Type**: Microservices (API + Worker)

**Performance Goals**: N/A

**Constraints**: Strict Layering, Multi-tenancy boundaries

**Scale/Scope**: N/A

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Hexagonal Microservice Architecture & Role Separation: Database updates for failed appointments happen in Worker. DB init happens in API startup.
- [x] Clean Architecture (Ports & Adapters) Systemic Boundaries: `ICacheProvider` updated with pure interface methods.
- [x] Multi-Tenancy & Maximum Security Data Isolation: Cache keys remain strictly tenant-scoped (e.g., `tenant:{tenant_id}:{entity}`).
- [x] Spec-Driven & Test-Driven Development (TDD): Tests will be updated or added.
- [x] Executive Command Execution Protocol: Followed.
- [x] Monorepo Structure & Docker Containerization: Followed.

## Project Structure

### Documentation (this feature)

```text
specs/011-api-caching-fixes/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# API Service
apps/appointment-api-service/
├── src/
│   ├── application/
│   │   ├── ports/
│   │   │   └── cache-provider.port.ts
│   │   └── use-cases/
│   ├── infrastructure/
│   │   ├── cache/
│   │   │   └── redis-cache.adapter.ts
│   │   └── db/
│   │       └── schema.ts
│   └── main.ts
├── openapi.yaml

# Worker Service
apps/appointment-worker-service/
├── src/
│   ├── Core/Application/
│   │   └── UseCases/
│   │       └── AppointmentProcessor.cs
```

**Structure Decision**: Monorepo with distinct microservices `appointment-api-service` (Node.js) and `appointment-worker-service` (C#). Changes spread across both.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

