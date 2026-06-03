# Keyloop Unified Service Scheduler

Keyloop Unified Service Scheduler is a multi-tenant appointment scheduling system for dealership service operations. It combines a TypeScript API, a .NET background worker, a React client UI, PostgreSQL, and Redis to support tenant-scoped booking, asynchronous appointment processing, read-through caching, auditability, reminders, and role-based access control.

The repository is organized as a monorepo:

- `apps/appointment-api-service`: Express, Zod, Drizzle ORM, Redis, JWT authentication, and OpenAPI contracts.
- `apps/appointment-worker-service`: .NET worker that consumes appointment messages, validates availability, persists records, and updates cache state.
- `apps/api-client-ui`: React and Vite client for authentication, tenant selection, dashboards, booking flows, and role-aware views.
- `specs`: Speckit feature specifications, plans, data models, quickstarts, contracts, and task lists.
- `.agents/rules`: development rules for TDD, multi-tenancy, and clean architecture.

## Current Feature Context

The active Speckit plan is `specs/015-user-access-control/plan.md`. The current direction is to retire the separate Customer concept from active workflows and use User ownership for vehicles and appointments. TenantUser accounts should see only their own vehicles and appointments, TenantManager and Admin accounts should see tenant-wide and personal views, elevated roles should get a Users tab, and Admin users should select a tenant before entering a dashboard.

Across the project, internal TypeScript imports must use static path aliases such as `@/domain/...` or `@/application/...`, not relative imports like `../` or `../../`.

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ and npm
- .NET 8 SDK for the worker service runtime
- .NET 10 SDK for the current worker test projects, which target `net10.0`

## Build And Run With Docker

From the repository root:

```bash
docker compose up --build -d
```

This starts:

- API service: `http://localhost:3000`
- Client UI: `http://localhost:8080`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

The API documentation is served by the API service at:

```text
http://localhost:3000/api/docs
```

Stop the full stack and remove volumes with:

```bash
docker compose down -v
```

## Run Services Locally

Start shared infrastructure first:

```bash
docker compose up -d postgres redis
```

Run the API service:

```bash
cd apps/appointment-api-service
npm ci
npm run dev
```

Run the worker service:

```bash
cd apps/appointment-worker-service
dotnet restore
dotnet run --project src/AppointmentWorkerService.csproj
```

Run the client UI:

```bash
cd apps/api-client-ui
npm ci
npm run dev
```

The UI dev server prints its local Vite URL, usually `http://localhost:5173`.

## Build

Build the whole containerized system:

```bash
docker compose build
```

Build the API service locally:

```bash
cd apps/appointment-api-service
npm ci
npm run build
```

Build the client UI locally:

```bash
cd apps/api-client-ui
npm ci
npm run build
```

Build the worker service locally:

```bash
cd apps/appointment-worker-service
dotnet build AppointmentWorkerService.sln
```

## Test

Run API unit tests:

```bash
cd apps/appointment-api-service
npm ci
npm run test:unit
```

Run API integration tests. Docker must be running because these tests use containerized infrastructure:

```bash
cd apps/appointment-api-service
npm run test:integration
```

Run worker unit and integration tests:

```bash
dotnet test apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/AppointmentWorkerService.Tests.Unit.csproj
dotnet test apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/AppointmentWorkerService.Tests.Integration.csproj
```

Run client UI verification:

```bash
cd apps/api-client-ui
npm ci
npm run lint
npm run build
```

For the active user access control work, the focused verification list is in `specs/015-user-access-control/quickstart.md` and includes file-specific Jest tests for appointment creation, vehicle creation, appointment/vehicle listing, tenant users, integration access checks, worker tests, UI lint, and UI build.

## Development Rules

The `.agents/rules` folder defines the guardrails used while building the system:

- TDD: write failing unit or integration tests before implementation, mock ports in use-case tests, and validate external boundaries with Zod or FluentValidation.
- Multi-tenancy: require and propagate `tenant_id`, prefix cache keys with `tenant:{tenant_id}:...`, partition messages by tenant, and ensure tenant-aware database filtering/indexing.
- Clean architecture: keep Domain free of infrastructure dependencies, put orchestration in Application use cases and ports, and isolate Redis, PostgreSQL, HTTP, and EF Core details in Infrastructure adapters.

## AI Collaboration Narrative

My high-level strategy was to use AI as a disciplined implementation partner, not as an unchecked code generator. I guided it with the repository's Speckit documents first, then forced every proposed change back through the project rules: TDD, strict tenant isolation, clean architecture, Dockerized monorepo boundaries, and path-alias imports. The goal was to make the AI reason from the system's contracts and constraints before touching code.

Example: for the user access control work, I did not ask the AI to simply "hide other users' data in the UI." I framed the requirement from `specs/015-user-access-control/spec.md`: TenantUser accounts must be blocked from other users' vehicles and appointments in list, search, filter, refresh, and direct-access scenarios, while still seeing tenant-wide technicians and service bays. That prompt shape pushed the AI toward server-side access filtering, repository-port changes, route tests, and UI tab changes instead of a cosmetic dashboard-only fix.

I also used the AI to decompose broad features into independent, testable slices. The specs already describe user stories and task phases, so I asked the AI to preserve that sequencing: schema and contract changes first, then role-scoped reads, then elevated-role personal/tenant tabs, then Users tab, then Admin tenant selection, then Customer-to-User cleanup. This kept cross-service work manageable because API, Worker, and UI changes could be verified against one story at a time.

Example: when replacing `customer_id` with `user_id`, the AI was guided to look beyond the API request model. The same ownership change had to flow through Drizzle schema, repository ports, use cases, Redis appointment hashes, worker stream payloads, EF mappings, seed data, UI forms, and OpenAPI. That prevented the common AI failure mode where one layer compiles but the system contract is broken somewhere else.

My verification process treated AI output as a draft that had to earn trust. For application use cases, I checked that tests mocked ports rather than databases or Redis. For infrastructure behavior, I checked that integration tests used realistic PostgreSQL and Redis paths. For access control, I looked for negative tests as well as happy paths: another user's record should not appear, direct record access should not disclose private data, and tenant switching should clear old tenant state.

Example: for appointment availability and realtime booking, the important checks were not only "can an appointment be created." The AI was steered to verify half-open interval overlap rules, active status handling, tenant-prefixed cache keys, worker cache updates, and polling-visible status transitions. This matters because a booking system can look correct in a simple demo while still allowing stale availability or cross-tenant leakage under real conditions.

I refined AI output by comparing each change against the local architecture. Domain entities should not import Express, Drizzle, Redis, EF Core, or HTTP clients. Application services should depend on ports. Infrastructure should implement those ports and translate infrastructure-specific errors before they leak inward. When AI suggestions crossed those boundaries, I redirected the design back to ports and adapters.

Example: for Redis caching, the AI was asked to keep cache behavior behind cache provider abstractions and tenant-prefixed key conventions such as `tenant:{tenant_id}:appointment:{id}`. That let the API and worker coordinate on cache shape without letting Redis-specific types become part of core business logic.

Final quality was ensured through layered review: spec coverage, contract consistency, test-first development, build/test commands, and manual acceptance checks for role behavior. I used the AI to search for stale terms like Customer after the active feature moved to User ownership, to cross-check OpenAPI examples against request schemas, and to identify places where UI state could accidentally retain data from a previous tenant.

Example: the final user access control acceptance pass should sign in as TenantUser, TenantManager, and Admin. TenantUser must see only personal vehicles and appointments. TenantManager and Admin must see tenant-wide and personal tabs. Users must be visible only to elevated roles. Admin must choose a tenant before the dashboard, and switching tenants must not leave records from the previous tenant on screen. Those manual checks complement automated tests because they validate the actual workflow the assessment reviewer will experience.

The result is a collaboration style where AI accelerates exploration and implementation, but the repository's specs, tests, contracts, and architecture rules remain the source of truth.
