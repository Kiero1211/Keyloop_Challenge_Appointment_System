# Implementation Plan: Audit Log

**Branch**: `010-audit-log` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-audit-log/spec.md`

## Summary

The Audit Log feature automatically records creation, update, and deletion actions on core entities directly in PostgreSQL. It guarantees isolation via tenant-id partitioning, ensures high-performance retrieval by bypassing the standard Redis caching layer, and validates queries to limit results to a maximum of 30 days.

## Technical Context

**Language/Version**: Node.js (TypeScript) & C# (.NET 8)

**Primary Dependencies**: Express, Zod, EF Core, Npgsql

**Storage**: PostgreSQL

**Testing**: Jest (Node.js API), xUnit (C# Worker), Docker Testcontainers

**Target Platform**: Docker (Linux Container)

**Project Type**: Hexagonal Microservices

**Performance Goals**: Fast queries by tenant and timestamp bypassing the caching layer. Scalability achieved by table partitioning on PostgreSQL.

**Constraints**: Multi-tenancy strict isolation; JSONB must be used to avoid data truncation on large entity payloads; database transaction boundaries must span both core entity modification and audit log creation.

**Scale/Scope**: Audit logs for all core entity writes (Create, Update, Delete).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Hexagonal Microservice Architecture & Role Separation**: Pass. The API service reads directly from the database without persistence logic, and the Worker service owns the write paths to create the audit records.
- **II. Clean Architecture (Ports & Adapters) Systemic Boundaries**: Pass. New Ports `IAuditLogRepository` (C#) and `AuditLogRepository` (Node.js) will be defined.
- **III. Multi-Tenancy & Maximum Security Data Isolation**: Pass. Table partitioned by `tenant_id` hash. All REST payload parameters require `tenant_id` validation.
- **IV. Spec-Driven & Test-Driven Development (TDD) — NON-NEGOTIABLE**: Pass. TDD workflow will be used to create unit and integration tests.
- **V. Executive Command Execution Protocol**: Pass. Implementation will adhere to the specified contract.

## Project Structure

### Documentation (this feature)

```text
specs/010-audit-log/
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
│   │   └── use-cases/tenant/get-audit-logs.use-case.ts
│   └── infrastructure/
│       ├── http/routes/tenant.routes.ts
│       └── db/repositories/drizzle-audit-log.repository.ts
└── tests/

apps/appointment-worker-service/
├── src/
│   ├── Core/Domain/Entities/AuditLogEntry.cs
│   ├── Core/Application/Ports/Repositories/IAuditLogRepository.cs
│   └── Infrastructure/Data/AuditLogRepository.cs
└── tests/

db/
└── init/
    └── 01-table.sql
```

**Structure Decision**: Hexagonal microservices across both the Node.js API and C# Worker components as dictated by the system constitution.
