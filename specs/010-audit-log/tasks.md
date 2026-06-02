# Tasks: Audit Log

**Input**: Design documents from `/specs/010-audit-log/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Verify project structure for Audit Log in `plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Update database schema to add `audit_logs` partitioned table in `db/init/01-table.sql` (Addresses User Story 3)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Audit Data Modifications (Priority: P1) 🎯 MVP

**Goal**: Automatically record all modifications (create, update, delete) to core entities so there is a reliable history.

**Independent Test**: Can be fully tested by creating, updating, and deleting core entities and verifying that the correct entries appear in the audit log database with the correct structure.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T003 [P] [US1] Integration test for Audit Log creation in `apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/Infrastructure/AuditLogRepositoryTests.cs`

### Implementation for User Story 1

- [X] T004 [P] [US1] Create `AuditLogEntry` entity in `apps/appointment-worker-service/src/Core/Domain/Entities/AuditLogEntry.cs`
- [X] T005 [P] [US1] Create `IAuditLogRepository` interface in `apps/appointment-worker-service/src/Core/Application/Ports/Repositories/IAuditLogRepository.cs`
- [X] T006 [US1] Implement `AuditLogRepository` adapter in `apps/appointment-worker-service/src/Infrastructure/Data/AuditLogRepository.cs`
- [X] T007 [US1] Configure EF Core mapping for `AuditLogEntry` in `apps/appointment-worker-service/src/Infrastructure/Data/AppDbContext.cs`
- [X] T008 [US1] Update `AppointmentRepository` or add a `SaveChangesInterceptor` to save Audit Log entries along with Appointments in `apps/appointment-worker-service/src/Infrastructure/Data/AppointmentRepository.cs`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Retrieve Audit History without caching (Priority: P2)

**Goal**: Retrieve the audit history in real-time without caching in Redis.

**Independent Test**: Can be fully tested by reading audit logs twice in succession and ensuring the database is queried directly both times, bypassing the Redis cache.

### Tests for User Story 2 ⚠️

- [x] T009 [P] [US2] Integration test for GetAuditLogs endpoint in `apps/appointment-api-service/tests/integration/tenant/audit-logs.test.ts`

### Implementation for User Story 2

- [x] T010 [P] [US2] Add API contracts from `contracts/audit-log-api.ts` into shared types or API service models (e.g. Zod schemas).
- [x] T011 [US2] Implement `DrizzleAuditLogRepository` adapter in `apps/appointment-api-service/src/infrastructure/db/repositories/drizzle-audit-log.repository.ts`
- [x] T012 [US2] Create `GetAuditLogsUseCase` in `apps/appointment-api-service/src/application/use-cases/tenant/get-audit-logs.use-case.ts`
- [x] T013 [US2] Register new endpoint in `apps/appointment-api-service/src/infrastructure/http/routes/tenant.routes.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T014 Run quickstart.md validation to ensure everything works end to end.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Can run entirely in parallel with US1.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- US1 tests and US2 tests can be written simultaneously.
- US1 (C# Worker changes) and US2 (Node.js API changes) touch completely separate services, so they can be implemented in parallel.

---

## Parallel Example: User Story 1 & 2

```bash
# Launch tests for both user stories together
Task: "Integration test for Audit Log creation"
Task: "Integration test for GetAuditLogs endpoint"

# Launch models and interfaces across services
Task: "Create AuditLogEntry entity"
Task: "Add API contracts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (C# Write Path) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Node.js Read Path) → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (C#)
   - Developer B: User Story 2 (Node.js)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Test Execution**: For Node.js services (API/Bay), run through each unit, integration, and e2e test file explicitly to ensure there are no errors, rather than relying on broad scripts like `npm run test:unit`. For C# worker service, `dotnet test` is sufficient.
