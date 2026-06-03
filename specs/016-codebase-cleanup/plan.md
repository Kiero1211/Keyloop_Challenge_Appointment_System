# Implementation Plan: Codebase Cleanup

**Branch**: `016-codebase-cleanup` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-codebase-cleanup/spec.md`

## Summary

Perform a behavior-preserving cleanup pass across non-test, non-generated repository files. The work will first inventory source/config/documentation areas, then record naming, placement, organization, duplication, and complexity findings, apply only simple low-risk fixes, and verify changed areas with existing project checks. The plan intentionally avoids broad service restructuring and treats any behavior change as out of scope unless explicitly approved.

## Technical Context

**Language/Version**: TypeScript 5.x for API and UI; C# .NET 8 for worker; Markdown/YAML/JSON/SQL for project metadata and documentation.

**Primary Dependencies**: API service uses Express, Zod, Drizzle ORM, ioredis, JWT middleware, Jest; UI uses React 18 and Vite; worker uses .NET Background Worker, EF Core, FluentValidation, StackExchange.Redis, xUnit.

**Storage**: No new storage. Cleanup may inspect PostgreSQL schema/migrations, Redis key helpers, seed SQL, and generated contract documentation, but must not introduce new persistence.

**Testing**: Existing focused Jest commands for changed Node.js/TypeScript source files; `dotnet test` for changed worker source; build/lint checks where they are the most relevant non-behavioral verification.

**Target Platform**: Existing Docker Compose local/runtime monorepo environment.

**Project Type**: Cross-service monorepo cleanup touching source, config, documentation, and Spec Kit metadata while preserving the current three application boundaries.

**Performance Goals**: Cleanup review should keep implementation simple and avoid runtime regressions. Any changed user-facing or service path should retain existing performance expectations from the owning feature area.

**Constraints**:
- Skip test files, generated output, dependency folders, coverage reports, and build artifacts.
- Preserve behavior unless the maintainer explicitly approves a behavior change.
- Do not add, remove, or merge application boundaries.
- Keep Domain and Application layers free of infrastructure-specific imports.
- Preserve tenant isolation and tenant-prefixed cache key rules.
- Use static imports with path aliases for all changed internal TypeScript imports.
- Prefer local conventions over new abstractions.
- Follow constitution TDD requirements for any production behavior change; for pure cleanup, verify with existing tests/checks covering the changed area.

**Scale/Scope**:
- Review active non-test, non-generated files in `apps/appointment-api-service`, `apps/appointment-worker-service`, `apps/api-client-ui`, root project configuration, `.specify`, `.agents`, `README.md`, and `docker-compose.yml`.
- Exclude `node_modules`, `dist`, `coverage`, `.local`, IDE caches, generated build output, and test directories.
- Produce a final cleanup report during implementation with findings, applied fixes, verification results, and deferred recommendations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Exactly 3 service boundaries | Pass | Cleanup stays within existing API, Worker, and UI areas; no new service or merged boundary is planned. The constitution references `apps/bay-service`, but this cleanup does not create or remove service boundaries. |
| I — API role separation | Pass | Any API cleanup must keep persistence in infrastructure adapters and avoid moving database access into controllers, Domain, or Application code. |
| I — Worker role separation | Pass | Worker cleanup must keep the worker as a background consumer and must not add HTTP endpoints. |
| I — Bay service role separation | Pass with existing-repo constraint | The repository does not currently contain `apps/bay-service`; this cleanup will not alter that architectural gap. If found as a source inconsistency, it will be reported rather than fixed opportunistically. |
| II — Ports & adapters | Pass | The cleanup will prefer existing ports/adapters and must not introduce infrastructure imports into Domain or Application layers. |
| III — Tenant isolation | Pass | Tenant validation, context propagation, cache keys, and table isolation rules must be preserved in all touched paths. |
| IV — TDD gate | Pass with cleanup scope | Behavior-changing production work remains subject to failing tests first. Pure naming/placement/simplification cleanup may proceed with existing relevant tests/checks because no new behavior is introduced. |
| V — Contracts first | Pass | The cleanup reporting contract is defined before implementation. Any touched external API contract must be verified before source changes. |
| VI — Monorepo and Docker | Pass | No repository split, new Dockerfile, or new Compose service is planned. Docker-related changes, if any, must preserve existing boot expectations. |

**Initial gate result**: Pass. No unjustified constitution violations are introduced by the planning approach.

## Project Structure

### Documentation (this feature)

```text
specs/016-codebase-cleanup/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cleanup-report.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── appointment-api-service/
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── seed/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig*.json
│   ├── jest*.config.*
│   └── openapi.yaml
├── appointment-worker-service/
│   ├── src/
│   │   ├── Core/Domain/
│   │   ├── Core/Application/
│   │   └── Infrastructure/
│   ├── Dockerfile
│   ├── AppointmentWorkerService.sln
│   ├── NuGet.Config
│   └── build/helper scripts and local artifacts for review
└── api-client-ui/
    ├── src/
    │   └── components/
    ├── public/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig*.json
    ├── vite.config.ts
    └── eslint.config.js

.agents/
├── rules/
└── skills/

.specify/
├── memory/
├── scripts/
├── templates/
└── extensions/

README.md
AGENTS.md
docker-compose.yml
```

**Structure Decision**: Keep the existing monorepo structure and review each current area in place. The cleanup implementation should fix simple local inconsistencies where references can be updated safely, and document broader structural issues as deferred recommendations.

## Complexity Tracking

> No new constitution violations requiring justification.

## Phase 0: Research

See [research.md](./research.md).

## Phase 1: Design

See [data-model.md](./data-model.md), [contracts/cleanup-report.md](./contracts/cleanup-report.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Exactly 3 service boundaries | Pass | Design is a cleanup workflow/reporting model only; it does not add or remove application boundaries. |
| I — API role separation | Pass | Cleanup report categories explicitly include layer-boundary findings instead of allowing opportunistic movement of persistence logic. |
| I — Worker role separation | Pass | Worker cleanup is limited to source organization and simplification inside existing worker responsibilities. |
| I — Bay service role separation | Pass with existing-repo constraint | Missing bay-service remains a possible finding/deferred recommendation, not an implementation change in this cleanup. |
| II — Ports & adapters | Pass | Contracts require cleanup findings to call out boundary risk and verification; no design requires concrete infrastructure in inner layers. |
| III — Tenant isolation | Pass | Tenant isolation is a mandatory preservation rule for any touched tenant-aware code. |
| IV — TDD gate | Pass | Quickstart requires tests before behavior changes and focused existing checks for pure cleanup changes. |
| V — Contracts first | Pass | Cleanup report contract exists before implementation tasks are generated. |
| VI — Monorepo and Docker | Pass | Design preserves root monorepo and existing Docker Compose structure. |
