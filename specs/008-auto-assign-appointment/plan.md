# Implementation Plan: Auto Assign Appointment

**Branch**: `main` | **Date**: 2026-06-02 | **Spec**: [specs/008-auto-assign-appointment/spec.md](file:///Users/kiero/Desktop/Code/Keyloop/specs/008-auto-assign-appointment/spec.md)

**Input**: Feature specification from `/specs/008-auto-assign-appointment/spec.md`

## Summary

This feature introduces an `autoAssigned` boolean flag for appointment creation. When true, the API service allows creation without explicit `technicianId` and `serviceBayId`. The worker service asynchronously searches for available resources matching the requested `serviceTypeId` skills using a distributed lock to prevent concurrency issues. Unfulfillable requests are routed to the DLQ.

## Technical Context

**Language/Version**: Node.js + Express + TypeScript (API Service) & C# .NET 8 (Worker Service)

**Primary Dependencies**: Zod (Node.js validation), FluentValidation (C#), EF Core (C#), Redis Streams (Message Queue)

**Storage**: Redis (Caching and Streams), PostgreSQL (Persistence)

**Testing**: Unit tests with mocked ports, Integration tests with Docker Testcontainers

**Target Platform**: Docker containers via docker-compose

**Project Type**: Monorepo with Hexagonal Microservices

**Performance Goals**: Fast HTTP ingestion (<200ms) with asynchronous worker processing.

**Constraints**: Strict Multi-tenancy isolation (`tenant_id`), Hexagonal Architecture layer separation, Distributed locking for auto-assignment.

**Scale/Scope**: System-wide appointment booking process impacting API routing, Worker logic, and DLQ infrastructure.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Hexagonal Architecture**: Yes, API only handles HTTP and Redis stream publish. Worker handles logic and EF Core.
- **Strict Layering**: Yes, Domain models self-defend. No EF Core/Redis specific types in Domain.
- **Multi-Tenancy**: Yes, `tenant_id` will be propagated and used for context and global query filters.
- **TDD**: Yes, tests will be scaffolded before implementation.
- **Docker/Monorepo**: Yes, changes are contained within existing services (`appointment-api-service`, `appointment-worker-service`).

## Project Structure

### Documentation (this feature)

```text
specs/008-auto-assign-appointment/
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
│   │   ├── commands/     # CreateAppointmentCommand validation
│   ├── infrastructure/
│   │   ├── http/routes/  # Appointment routes
apps/appointment-worker-service/
├── src/
│   ├── Core/Application/ # AppointmentProcessor / Assign logic
│   ├── Core/Domain/      # Appointment entity (autoAssigned flag)
│   ├── Infrastructure/   # Redis locking implementation, DLQ publisher
```

**Structure Decision**: Monorepo with modifications in both the API service (for payload validation and command building) and the Worker service (for the asynchronous matching and persistence logic).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
