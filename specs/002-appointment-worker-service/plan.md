# Implementation Plan: appointment-worker-service

**Branch**: `002-appointment-worker-service` | **Date**: 2026-05-30 | **Spec**: [spec.md](file:///Users/kiero/Desktop/Code/Keyloop/specs/002-appointment-worker-service/spec.md)

**Input**: Feature specification from `/specs/002-appointment-worker-service/spec.md`

## Summary

Implement the core long-running background worker in `apps/appointment-worker-service/` using C# .NET 8 `BackgroundService`. The worker will consume appointment requests from Redis Streams, validate real-time resource availability (Service Bay and Technician) via an HTTP call to `bay-service`, enforce optimistic concurrency control to prevent double-bookings, persist the confirmed appointment to PostgreSQL using EF Core, and update the status in Redis.

## Technical Context

**Language/Version**: C# 12, .NET 8.0
**Primary Dependencies**: Microsoft.Extensions.Hosting, StackExchange.Redis, Npgsql.EntityFrameworkCore.PostgreSQL, FluentValidation
**Storage**: PostgreSQL (via EF Core) and Redis (via StackExchange.Redis)
**Testing**: xUnit, NSubstitute, Testcontainers
**Target Platform**: Linux Docker container
**Project Type**: Background Worker Service
**Performance Goals**: At least 100 appointment requests/min, concurrent processing of 1-4 streams
**Constraints**: Strict Hexagonal Architecture layer boundaries, strict multi-tenancy isolation (`tenant_id`), zero double-bookings via concurrency control
**Scale/Scope**: Handles all asynchronous booking fulfillment for the ecosystem

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Hexagonal Microservice Architecture & Role Separation**: The worker will not expose HTTP endpoints. It acts purely as a consumer.
- [x] **II. Clean Architecture boundaries**: `Core/Domain`, `Core/Application`, and `Infrastructure` layers will be strictly separated.
- [x] **III. Multi-Tenancy & Data Isolation**: EF Core Global Query Filter will be used. Redis keys will be prefixed with `tenant:{tenant_id}`.
- [x] **IV. Spec-Driven & TDD**: Development will proceed test-first.
- [x] **VI. Monorepo & Docker**: Service resides in `apps/appointment-worker-service/` with its own `Dockerfile` and builds via the root `docker-compose.yml`.

## Project Structure

### Documentation (this feature)

```text
specs/002-appointment-worker-service/
├── plan.md              
├── research.md          
├── data-model.md        
├── quickstart.md        
└── contracts/           
```

### Source Code (repository root)

```text
apps/appointment-worker-service/
├── src/
│   ├── Core/
│   │   ├── Domain/
│   │   └── Application/
│   ├── Infrastructure/
│   └── Program.cs
├── tests/
│   ├── UnitTests/
│   └── IntegrationTests/
├── Dockerfile
└── appointment-worker-service.csproj
```

**Structure Decision**: A standard .NET Clean Architecture structure mapped to the constitution's monorepo layout.
