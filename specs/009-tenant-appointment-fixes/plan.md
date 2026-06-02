# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement multi-tenant role management, robust tenant switching, multi-day appointment search, and availability endpoints for Technicians/ServiceBays. Ensure `tenant_id` boundaries are strictly preserved across databases and Redis streams, and calculate appointment end-times dynamically based on ServiceType duration.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Node.js (TypeScript) & C# .NET 8

**Primary Dependencies**: Express, Zod, ioredis (Node.js), EF Core, FluentValidation (C#)

**Storage**: Redis, PostgreSQL

**Testing**: Jest/Mocha (Node), xUnit/NUnit (C#), Testcontainers

**Target Platform**: Docker (Linux containers)

**Project Type**: Microservices (API Service, Worker Service, Bay Service)

**Performance Goals**: Fast HTTP ingestion, async processing

**Constraints**: Multi-tenancy (strict isolation), strict Hexagonal Architecture

**Scale/Scope**: Multi-tenant appointment scheduling

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Hexagonal Microservice Architecture**: The availability query endpoint must correctly route through `appointment-api-service` which might need to query `bay-service` for availability, respecting roles.
- [x] **II. Clean Architecture (Ports & Adapters)**: All modifications in API and Worker must use Ports/Adapters.
- [x] **III. Multi-Tenancy**: The `switch-tenant` feature and stream `tenant:` prefix fixes will strictly enforce this.
- [x] **IV. Spec-Driven & TDD**: Required tests for multi-day search and tenant switching will be defined in tasks.
- [x] **VI. Monorepo Structure**: All services exist and will be updated in their respective `apps/` folders.

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── apps/appointment-api-service/
│   ├── src/application/use-cases/
│   ├── src/infrastructure/http/routes/
│   └── src/infrastructure/db/
├── apps/appointment-worker-service/
└── apps/bay-service/
```

**Structure Decision**: Using Option 1 equivalent but across the Monorepo structure defined by `constitution.md`. We will modify the API service, Worker service, and potentially Bay service.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
