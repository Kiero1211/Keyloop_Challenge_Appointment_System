<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.1.1 (PATCH — Test execution clarification)
Modified principles: 
  - IV. Spec-Driven & Test-Driven Development (TDD) — NON-NEGOTIABLE (Added Test Execution Rules)
Added sections: None
Removed sections: None
Templates requiring updates:
  ✅ .specify/templates/tasks-template.md — Validation plan updated to reflect the new test execution rules.
Follow-up TODOs: None.
-->

# Unified Service Scheduler — System Constitution

## Core Principles

### I. Hexagonal Microservice Architecture & Role Separation

The system MUST consist of exactly three application boundaries. No logic may be merged across these
boundary lines:

1. **`apps/appointment-api-service/`** (Node.js + Express + TypeScript)
   - MUST act solely as a high-throughput ingestion layer.
   - MUST write an ephemeral idempotency hash to Redis before routing any command to prevent rapid-fire
     duplicate submissions.
   - MUST route every command deterministically via the hashing function
     `f(tenant_id, vehicle_id) → partition_id` across exactly **4** predefined Redis Stream partitions.
   - MUST NOT contain persistence logic, worker logic, or direct database access.

2. **`apps/appointment-worker-service/`** (C# .NET 8 Background Worker)
   - MUST act as the long-running, asynchronous message consumer for Redis Stream partitions.
   - MUST own all complex time-slot intersection logic, constraint evaluation, and atomic database
     persistence.
   - MUST NOT expose any HTTP endpoints for external callers (it is not an API server).

3. **`apps/bay-service/`** (Node.js + Express + TypeScript)
   - MUST track and serve real-time scheduling windows for physical ServiceBays and qualified
     Technicians only.
   - MUST expose a simple, synchronous REST interface queried by the worker service via a Port adapter.
   - MUST NOT own appointment booking logic, worker queuing logic, or Redis Stream management.

**Rationale**: Violating service boundary roles creates invisible coupling that defeats horizontal
scalability and independent deployment. Every PR MUST be reviewed against this role map.

---

### II. Clean Architecture (Ports & Adapters) Systemic Boundaries

Every application within this ecosystem MUST implement a strict Hexagonal Architecture. The following
layer boundaries are non-negotiable and apply to every service:

- **Domain Layer** (`src/domain/` in Node.js | `src/Core/Domain/` in C#):
  - MUST contain zero dependencies on databases, ORMs, caches, web frameworks, or messaging clients.
  - MUST house only pure Entities, Aggregates, Value Objects, Domain Events, and Domain Exceptions.
  - Domain models MUST be self-defending: throw a distinct `DomainValidationException` immediately if
    driven into an invalid state.

- **Application Layer** (`src/application/` in Node.js | `src/Core/Application/` in C#):
  - MUST contain all use cases, command handlers, and query handlers.
  - MUST define strict **Port** interfaces (e.g., `IAppointmentRepository`, `IMessagePublisher`,
    `ICacheProvider`, `IBayAvailabilityService`). No concrete dependencies on SDKs.
  - MUST NOT import any infrastructure-specific library (e.g., `ioredis`, `Npgsql`, `StackExchange.Redis`).

- **Infrastructure Layer** (`src/infrastructure/` in Node.js | `src/Infrastructure/` in C#):
  - MUST contain all concrete **Adapter** implementations of the application Ports (e.g., Redis Stream
    publishers, PostgreSQL repositories, Express HTTP controllers).
  - **Portability Rule**: Infrastructure-specific exception types (e.g., `NpgsqlException`, `RedisValue`,
    `KafkaException`) MUST be trapped inside the Adapter and re-thrown as generic Domain Exceptions.
    They MUST NOT propagate upward to the Application or Domain layers.
  - All concrete Adapters MUST be bound to their Port interfaces at the application composition root via
    dependency injection.

**Rationale**: Strict layer decoupling is the foundational guarantee that allows switching Redis Streams
for Kafka, or PostgreSQL for SQL Server, without touching Domain or Application logic.

---

### III. Multi-Tenancy & Maximum Security Data Isolation

Data isolation between dealership tenants (`tenant_id`) is a critical security constraint. A
cross-tenant data leak constitutes an **immediate system failure** and a production incident.

- **Payload Validation (Hard Boundary)**: Every incoming HTTP request payload and every Redis Stream
  message MUST be validated for the presence of a non-empty `tenant_id` at the controller or consumer
  edge. Requests MUST be rejected immediately (HTTP 400 / message drop) if `tenant_id` is missing,
  null, or empty.

- **Context Propagation (No Drilling)**: The active `tenant_id` MUST be propagated downstream via
  scoped async context mechanisms — `AsyncLocalStorage` in Node.js and `AsyncLocal<T>` in C#. Manual
  parameter-drilling of `tenant_id` through function signatures is PROHIBITED.

- **Cache Key Matrix**: All Redis cache keys MUST strictly follow this tenant-prefixed layout:
  ```
  tenant:{tenant_id}:{resource_type}:{resource_id}
  ```
  *Example*: `tenant:dealership-abc:appointment:vin-12345`

- **Database Isolation**:
  - Every relational table MUST include a `tenant_id` column.
  - EF Core DbContext MUST apply a **Global Query Filter** scoped to the active `tenant_id` to
    inherently restrict all reads to the authenticated tenant.
  - Every table MUST have a composite index on `(tenant_id, id)` or `(tenant_id, lookup_column)` to
    prevent full-table scans.

**Rationale**: Multi-tenancy isolation is a legal and contractual obligation. No feature is worth
shipping if it risks cross-dealership data exposure.

---

### IV. Spec-Driven & Test-Driven Development (TDD) — NON-NEGOTIABLE

No production code may be written without a preceding specification and failing test. The TDD loop is
mandatory:

1. **Write failing tests** demonstrating both the happy path and edge cases (malformed payloads, missing
   `tenant_id`, timeline intersections, duplicate submissions).
2. **Confirm tests fail** (Red phase).
3. **Write the minimal production code** required to make the tests pass (Green phase).
4. **Refactor** while keeping tests green (Refactor phase).

- **Mock Isolation for Unit Tests**: Unit tests MUST mock Port interfaces completely. They MUST NOT
  connect to live Redis, databases, HTTP endpoints, or file streams.
- **Integration Tests**: Integration tests are confined to the Infrastructure layer only. They MUST use
  Docker Testcontainers to spin up lightweight, isolated service instances (e.g., Redis, PostgreSQL).
- **Validation Guardrails**:
  - Node.js: HTTP boundary validation MUST use strict `Zod` schema definitions.
  - C# Worker: Consumer ingress MUST validate payloads using `FluentValidation`.
- **Test Execution Rules**:
  - **Node.js (API & Bay Services)**: When verifying tests, run through each unit, integration, and e2e test file to ensure there are no errors (e.g., explicitly testing the files or using `npx jest <file>`) instead of relying on broad scripts like `npm run test:unit`.
  - **C# Worker**: Standard `dotnet test` execution is sufficient as the sandbox handles it reliably.

**Rationale**: Predictability and verified correctness outweigh delivery speed. Untested code is
treated as unshipped code.

---

### V. Executive Command Execution Protocol

When implementing any feature, command, or task, the agent MUST follow this mandatory sequence:

1. **Draft Structural Contracts First**: Before writing implementation code, create or verify the
   structural contracts — `openapi.yaml` spec, `.proto` files, or TypeScript/C# interface definitions.
2. **Scaffold Tests Before Implementation**: Write or scaffold the failing test definitions
   demonstrating the targeted capability, verifying compliance with multi-tenancy and layer boundaries.
3. **Implement Minimally and Correctly**: Write the minimal block of clean, structured production code
   to satisfy the generated specification. Run lint-checking tools immediately upon completion.

**Rationale**: Contracts and tests define the system's behavior surface. Implementing before specifying
creates drift that is expensive to correct.

---

### VI. Monorepo Structure & Docker Containerization

The entire project MUST be organized as a single monorepo. All applications and shared packages live
under one git root. Independent deployability is achieved via Docker, not via repository splitting.

**Required Top-Level Directory Layout**:

```
/                                   ← Git root (monorepo)
├── apps/
│   ├── appointment-api-service/    ← Node.js + Express + TypeScript
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   ├── tests/
│   │   ├── Dockerfile              ← Service-specific Dockerfile (REQUIRED)
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── appointment-worker-service/ ← C# .NET 8 Background Worker
│   │   ├── src/
│   │   │   ├── Core/Domain/
│   │   │   ├── Core/Application/
│   │   │   └── Infrastructure/
│   │   ├── tests/
│   │   ├── Dockerfile              ← Service-specific Dockerfile (REQUIRED)
│   │   └── *.csproj
│   └── bay-service/                ← Lightweight availability service
│       ├── src/
│       ├── tests/
│       ├── Dockerfile              ← Service-specific Dockerfile (REQUIRED)
│       └── package.json
├── packages/                       ← (Optional) Shared contracts, types, or utilities
│   └── shared-types/
├── docker-compose.yml              ← Root orchestration file (REQUIRED)
├── docker-compose.override.yml     ← Local development overrides (OPTIONAL)
├── .agents/
├── .specify/
└── README.md
```

**Per-Service Dockerfile Rules**:
- Every application in `apps/` MUST have its own `Dockerfile` at the service root.
- Dockerfiles MUST use multi-stage builds: a `builder` stage for compilation/transpilation and a
  lean `runtime` stage for the final image to minimize image size and attack surface.
- Dockerfiles MUST NOT bake secrets, credentials, or environment-specific configuration into the
  image. Configuration MUST be injected at runtime via environment variables or mounted secrets.

**Root `docker-compose.yml` Rules**:
- A single `docker-compose.yml` at the repository root MUST be capable of booting the entire system
  (all three services + Redis + PostgreSQL) in one command: `docker compose up`.
- Each service definition MUST declare its `build.context` pointing to the service's subdirectory
  and reference the service-specific `Dockerfile`.
- Service-to-service communication MUST use Docker Compose internal network DNS names
  (e.g., `http://bay-service:3001`) — no hardcoded IP addresses.
- Health checks MUST be defined for every stateful dependency (Redis, PostgreSQL) so dependent
  services start only after dependencies are healthy.

**Rationale**: A monorepo guarantees a single source of truth for cross-service contracts and shared
types. Docker-first deployment ensures environment parity between local development and production,
eliminating "works on my machine" failure classes.

---

## Technology Stack Constraints

The following technology choices are fixed for v1.0 of this system. Deviations require a constitution
amendment:

| Concern                       | Technology                                                              |
|-------------------------------|-------------------------------------------------------------------------|
| Repository Style              | Monorepo (single git root, `apps/` + `packages/`)                      |
| API Service Runtime           | Node.js + Express + TypeScript                                          |
| API Validation                | Zod                                                                     |
| Redis Client (Node.js)        | ioredis                                                                 |
| Worker Runtime                | C# .NET 8 (Background Worker / Docker)                                 |
| Worker Validation             | FluentValidation                                                        |
| Worker ORM                    | EF Core (or Dapper for raw performance)                                 |
| Message Queue/Stream          | Redis Streams (4 partitions, swappable to Kafka via Port abstraction)  |
| Cache                         | Redis (swappable to Memcached via ICacheProvider Port)                  |
| Database (Worker)             | PostgreSQL (swappable to SQL Server via IAppointmentRepository Port)   |
| Bay Service Runtime           | Lightweight Node.js / Express or Go                                     |
| Container Images              | Docker (multi-stage builds, one `Dockerfile` per service in `apps/`)  |
| Root Orchestration            | `docker-compose.yml` at repo root — boots all services in one command  |
| Local Dev Overrides           | `docker-compose.override.yml` (optional hot-reload mounts, debug ports) |
| Integration Test Infra        | Docker Testcontainers                                                   |

---

## Development Workflow & Quality Gates

Every pull request MUST pass these gates before merge:

1. **Constitution Check**: Reviewer verifies the change does not violate any principle in this document.
2. **Layer Boundary Check**: No infrastructure-specific import appears in Domain or Application layers.
3. **Tenant Isolation Check**: All new code paths validate `tenant_id` and use the correct cache key
   format.
4. **TDD Gate**: All new functionality is covered by at least one unit test (mocked ports) and one
   integration test (Testcontainers) where applicable.
5. **Lint Pass**: `eslint` (Node.js) and `dotnet format` (C#) MUST pass with zero errors.

---

## Governance

This constitution supersedes all other development practices, style guides, and informal conventions
within this repository. It applies equally to all agents (AI or human) contributing to the codebase.

- **Amendment Procedure**: Any proposed change to this constitution MUST be documented in a PR with:
  1. The principle being amended and the reason for the change.
  2. A migration plan for existing code affected by the new rule.
  3. Updated `LAST_AMENDED_DATE` and a version bump per Semantic Versioning rules.
- **Versioning Policy**:
  - MAJOR: Backward-incompatible governance changes (principle removals or incompatible redefinitions).
  - MINOR: New principles or materially expanded guidance added.
  - PATCH: Clarifications, wording fixes, non-semantic refinements.
- **Compliance Review**: All PRs/code reviews MUST explicitly verify compliance with Principles I–V
  above. Non-compliant code MUST NOT be merged, regardless of feature completeness.
- **Runtime Development Guidance**: Use `.agents/rules/` workspace rules for runtime AI agent
  development constraints that align with this constitution.

**Version**: 1.1.1 | **Ratified**: 2026-05-30 | **Last Amended**: 2026-06-02
