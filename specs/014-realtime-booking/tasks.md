# Tasks: Real-Time Appointment Booking

**Input**: Design documents from `specs/014-realtime-booking/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/openapi.yaml](./contracts/openapi.yaml) · [quickstart.md](./quickstart.md)

**Branch**: `014-realtime-booking`

**Tests**: TDD required per constitution (Section IV). Unit tests must be written and confirmed failing before implementation. Integration tests use Docker Testcontainers.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

---

## Phase 1: Setup (Shared Port Interface Extensions)

**Purpose**: Extend the `ICacheProvider` port contracts in both services — no implementation yet. This is the single blocking prerequisite for all subsequent phases because every new use case and adapter depends on these interfaces.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Extend `ICacheProvider` port in `apps/appointment-api-service/src/application/ports/cache-provider.port.ts` — add `zadd(key, score, member)`, `zrem(key, member)`, `zrangebyscore(key, min, max)`, `srem(key, member)` method signatures
- [ ] T002 Extend `ICacheProvider` interface in `apps/appointment-worker-service/src/Core/Application/Ports/ICacheProvider.cs` — add `HashSetFieldsAsync`, `SortedSetAddAsync`, `SortedSetRemoveAsync`, `SetAddAsync`, `SetRemoveAsync`, `SetMembersAsync` method signatures
- [ ] T003 [P] Implement new Node.js port methods in `apps/appointment-api-service/src/infrastructure/cache/redis-cache.adapter.ts` — implement `zadd`, `zrem`, `zrangebyscore`, `srem` using `ioredis`
- [ ] T004 [P] Implement new C# port methods in `apps/appointment-worker-service/src/Infrastructure/Cache/CacheProvider.cs` — implement `HashSetFieldsAsync`, `SortedSetAddAsync`, `SortedSetRemoveAsync`, `SetAddAsync`, `SetRemoveAsync`, `SetMembersAsync` using `StackExchange.Redis`

**Checkpoint**: Both `ICacheProvider` contracts are extended and their adapters compile cleanly. All user story phases can now begin.

---

## Phase 2: Foundational (Shared Redis Key Constants)

**Purpose**: Define the canonical cache key builder/constants used across all new use cases in both services. Prevents key format drift between API and Worker.

- [ ] T005 Create `apps/appointment-api-service/src/domain/cache-keys.ts` — export pure functions: `appointmentHashKey(tenantId, appointmentId)`, `activeAppointmentsSetKey(tenantId)`, `technicianOccupiedKey(tenantId, technicianId)`, `bayOccupiedKey(tenantId, bayId)`, `occupiedSlotHashKey(tenantId, appointmentId)` following the `tenant:{t}:{type}:{id}` convention
- [ ] T006 Create `apps/appointment-worker-service/src/Core/Domain/CacheKeys.cs` — mirror the same key-builder static methods for use in the C# Worker

**Checkpoint**: Both services share the same logical key format via dedicated constant files. Ready for user story implementation.

---

## Phase 3: User Story 1 — Create Appointment with Live Status Feedback (Priority: P1) 🎯 MVP

**Goal**: After submitting the create appointment form, the new appointment appears in the active list with "Pending" status within 1 second and transitions automatically to "Scheduled" or "Failed".

**Independent Test**: Submit a `POST /api/v1/appointments` request. Immediately query `GET /api/v1/appointments/active` and verify the appointment appears with `status=Pending`. Wait for the worker to process it, then re-query and verify `status=Scheduled`.

### Tests for User Story 1

> **Write tests first — confirm they FAIL before writing implementation code**

- [ ] T007 [P] [US1] Write unit test for updated `CreateAppointmentUseCase` in `apps/appointment-api-service/tests/unit/use-cases/create-appointment.use-case.test.ts` — assert `hset` called with `status=Pending` and all appointment fields, assert `sadd` called on active-index set key
- [ ] T008 [P] [US1] Write unit test for `GetActiveAppointmentsUseCase` in `apps/appointment-api-service/tests/unit/use-cases/get-active-appointments.use-case.test.ts` — mock `ICacheProvider`; assert `smembers` → `hgetall` pipeline returns only Pending and Scheduled entries
- [ ] T009 [P] [US1] Write unit test for updated `AppointmentProcessor` (C#) in `apps/appointment-worker-service/tests/Core/Application/UseCases/AppointmentProcessorTests.cs` — assert `HashSetFieldsAsync` called with `status=Scheduled` on success; assert `HashSetFieldsAsync` called with `status=Failed` + TTL=3600s on failure; assert `SetRemoveAsync` called on failure

### Implementation for User Story 1

- [ ] T010 [US1] Modify `apps/appointment-api-service/src/application/use-cases/create-appointment.use-case.ts` — after `messagePublisher.publish(...)`, call `cacheProvider.hset(appointmentHashKey(...), { id, tenantId, customerId, vehicleId, serviceTypeId, technicianId, serviceBayId, startTime, endTime, status: 'Pending', notes: '', createdAt, updatedAt })` and `cacheProvider.sadd(activeAppointmentsSetKey(tenantId), [appointmentId])` (depends on T001, T005)
- [ ] T011 [US1] Create `apps/appointment-api-service/src/application/use-cases/get-active-appointments.use-case.ts` — reads active index set via `smembers`, fetches each hash via `hgetall`, filters `status IN [Pending, Scheduled]`, returns array (depends on T001, T005)
- [ ] T012 [US1] Add `GET /active` route to `apps/appointment-api-service/src/infrastructure/http/routes/appointment.routes.ts` — instantiate `GetActiveAppointmentsUseCase`, validate tenant context, return JSON (depends on T011)
- [ ] T013 [US1] Add `getActiveAppointments()` function to `apps/api-client-ui/src/api.ts` — calls `GET /api/v1/appointments/active`
- [ ] T014 [US1] Modify `apps/appointment-worker-service/src/Core/Application/UseCases/AppointmentProcessor.cs` — on success: call `HashSetFieldsAsync(appointmentHashKey, { status: "Scheduled", notes, updatedAt })` using canonical key from `CacheKeys.cs`; remove the old non-conformant `{tenantId}:AppointmentDetail:{id}` write (depends on T002, T006)
- [ ] T015 [US1] Modify `apps/appointment-worker-service/src/Core/Application/UseCases/AppointmentProcessor.cs` — on failure: call `HashSetFieldsAsync(appointmentHashKey, { status: "Failed", notes: exMessage, updatedAt }, ttl: 3600s)` and `SetRemoveAsync(activeSetKey, appointmentId)` (depends on T002, T006)
- [ ] T016 [US1] Add active appointments polling to `apps/api-client-ui/src/App.tsx` — use `setInterval` (4 s) while the Appointments tab is active; display list with status badges; cleanup interval on unmount/tab-switch

**Checkpoint**: Create an appointment via the UI, see "Pending" badge appear immediately, see it change to "Scheduled" within ~5 s without reload. The MVP is demonstrable.

---

## Phase 4: User Story 2 — Live Technician and Bay Availability During Booking (Priority: P2)

**Goal**: Technician and service bay dropdowns in the create appointment modal show only unoccupied resources for the full service duration, and re-filter when any field changes.

**Independent Test**: Open two browser sessions. In session B, complete a booking for Technician X. In session A, change the service type or start time field. Verify Technician X no longer appears in the dropdown.

### Tests for User Story 2

- [ ] T017 [P] [US2] Write unit test for `GetTechnicianOccupiedSlotsUseCase` in `apps/appointment-api-service/tests/unit/use-cases/get-technician-occupied-slots.use-case.test.ts` — mock `ICacheProvider`; assert `zrangebyscore` called with correct day range; assert `hgetall` called for each slot member
- [ ] T018 [P] [US2] Write unit test for `GetBayOccupiedSlotsUseCase` in `apps/appointment-api-service/tests/unit/use-cases/get-bay-occupied-slots.use-case.test.ts` — same pattern for bay

### Implementation for User Story 2

- [ ] T019 [US2] Create `apps/appointment-api-service/src/application/use-cases/get-technician-occupied-slots.use-case.ts` — accepts `tenantId`, `technicianId`, optional `date`; calls `cacheProvider.zrangebyscore(technicianOccupiedKey(...), dayStart, dayEnd)` to get appointment IDs; fetches each `occupiedSlotHashKey` via `hgetall`; returns array of `{ appointmentId, startTime, endTime }` (depends on T001, T005)
- [ ] T020 [US2] Create `apps/appointment-api-service/src/application/use-cases/get-bay-occupied-slots.use-case.ts` — same pattern for service bay (depends on T001, T005)
- [ ] T021 [US2] Add `GET /:id/occupied` route to `apps/appointment-api-service/src/infrastructure/http/routes/technicians.routes.ts` — instantiate `GetTechnicianOccupiedSlotsUseCase`, pass `date` query param (depends on T019)
- [ ] T022 [US2] Add `GET /:id/occupied` route to `apps/appointment-api-service/src/infrastructure/http/routes/service-bays.routes.ts` — instantiate `GetBayOccupiedSlotsUseCase`, pass `date` query param (depends on T020)
- [ ] T023 [US2] Add `getOccupiedSlots(resourceType: 'technicians' | 'service-bays', id: string, date?: string)` to `apps/api-client-ui/src/api.ts`
- [ ] T024 [US2] Update the technician and bay dropdowns in the create appointment modal in `apps/api-client-ui/src/components/CreateAppointmentModal.tsx` (or equivalent) — on service type / start time change, call the occupied-slots endpoint for each resource and filter out resources with an overlapping slot for the full service duration

**Checkpoint**: Open the create appointment modal, select a service type and start time — only unoccupied technicians and bays appear. When a concurrent booking is made, the dropdown re-filters on the next field change.

---

## Phase 5: User Story 4 — Occupied Time Frame Display for Selected Resource (Priority: P2)

**Goal**: When a technician or bay is selected in the modal, the UI displays their currently committed time windows in a panel below the dropdown. The panel polls live while the modal is open.

**Independent Test**: Select any technician from the dropdown. Verify the occupied panel lists their scheduled time windows. Complete an appointment for that technician; within the polling interval, the new time range appears in the panel.

### Tests for User Story 4

- [ ] T025 [P] [US4] Write integration test for `GET /api/v1/technicians/:id/occupied` in `apps/appointment-api-service/tests/integration/routes/technicians.occupied.test.ts` — seed Redis sorted set + companion hashes, call endpoint, verify response shape matches `contracts/openapi.yaml`
- [ ] T026 [P] [US4] Write integration test for `GET /api/v1/service-bays/:id/occupied` in `apps/appointment-api-service/tests/integration/routes/service-bays.occupied.test.ts` — same pattern

### Implementation for User Story 4

- [ ] T027 [US4] Add occupied time panel UI component to `apps/api-client-ui/src/components/OccupiedSlotsPanel.tsx` — accepts `resourceType` + `resourceId`; polls `getOccupiedSlots(...)` on 4 s interval while visible; renders a list of `{ appointmentId, startTime, endTime }` rows; stops polling on unmount (depends on T023)
- [ ] T028 [US4] Wire `OccupiedSlotsPanel` into the create appointment modal in `apps/api-client-ui/src/components/CreateAppointmentModal.tsx` — render panel when a technician is selected; render panel when a bay is selected; panels update independently (depends on T027)
- [ ] T029 [US4] Modify `apps/appointment-worker-service/src/Core/Application/UseCases/AppointmentProcessor.cs` — on success (Scheduled): call `SortedSetAddAsync(technicianOccupiedKey, appointmentId, startTimeUnixEpoch)`, `SortedSetAddAsync(bayOccupiedKey, appointmentId, startTimeUnixEpoch)`, and `HashSetFieldsAsync(occupiedSlotHashKey, { appointmentId, startTime, endTime })` for each (depends on T002, T006)
- [ ] T030 [US4] Add `Completed`/`Cancelled` occupancy cleanup to `apps/appointment-worker-service/src/Core/Application/UseCases/AppointmentProcessor.cs` or a new `UpdateAppointmentStatusHandler` — call `SortedSetRemoveAsync(technicianOccupiedKey, appointmentId)`, `SortedSetRemoveAsync(bayOccupiedKey, appointmentId)`, `DeleteAsync(occupiedSlotHashKey)`, `SetRemoveAsync(activeSetKey, appointmentId)` (depends on T002, T006)

**Checkpoint**: Select a technician in the create appointment modal — occupied time windows appear in the panel. Create a new appointment for that technician — within 4 s the new slot appears in the panel.

---

## Phase 6: User Story 3 — Active Appointment Dashboard Near Real-Time (Priority: P3)

**Goal**: The appointments dashboard auto-refreshes Pending and Scheduled appointments within 5 seconds of any status change, without manual page reload.

**Independent Test**: Open the appointments dashboard tab. In another tab, create an appointment. Within 5 s the new appointment appears in the dashboard tab with "Pending", then transitions to "Scheduled".

### Implementation for User Story 3

- [ ] T031 [US3] Add polling logic to the appointments section of `apps/api-client-ui/src/App.tsx` — replace or supplement the static `getAppointments()` call with a 4 s `setInterval` calling `getActiveAppointments()`; merge with or replace the existing appointments list; clean up on unmount (depends on T013, T016)
- [ ] T032 [US3] Add visual status badge differentiation to the appointments list in `apps/api-client-ui/src/App.tsx` or `apps/api-client-ui/src/components/DataTable.tsx` — colour-coded `Pending` (amber), `Scheduled` (green), `Failed` (red) badges

**Checkpoint**: With docker compose running, create an appointment in one tab and see the dashboard update in < 5 s in another tab without any user interaction.

---

## Phase 7: Startup Cold-Start Seed (Cross-Cutting)

**Purpose**: Ensure Redis occupancy and appointment hash caches are correctly populated when the API service restarts cold (Redis empty).

- [ ] T033 Create `apps/appointment-api-service/src/infrastructure/startup/startup-seed.service.ts` — on startup, query `appointmentCrudRepository` for all `Scheduled` appointments; for each: write appointment hash, add to active index set, `ZADD` technician and bay sorted sets, `HSET` companion slot hashes
- [ ] T034 Register `StartupSeedService` in `apps/appointment-api-service/src/infrastructure/http/app.ts` — call `await startupSeedService.seed()` before the Express server begins accepting requests (depends on T033)

---

## Phase 8: Integration Tests for Adapters

**Purpose**: Verify the new `ICacheProvider` methods in both adapters work correctly against a real Redis instance.

- [ ] T035 [P] Write integration tests for `RedisCacheAdapter` new methods in `apps/appointment-api-service/tests/integration/cache/redis-cache-adapter.test.ts` — test `zadd`, `zrem`, `zrangebyscore`, `srem` using Testcontainers Redis; run with `npx jest tests/integration/cache/redis-cache-adapter.test.ts`
- [ ] T036 [P] Write integration tests for `CacheProvider.cs` new methods in `apps/appointment-worker-service/tests/Infrastructure/Cache/CacheProviderTests.cs` — test `HashSetFieldsAsync`, `SortedSetAddAsync`, `SortedSetRemoveAsync`, `SetAddAsync`, `SetRemoveAsync`, `SetMembersAsync` using Testcontainers Redis; run with `dotnet test`

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T037 [P] Update OpenAPI spec in `apps/appointment-api-service` (if one exists) with the three new endpoint definitions from `contracts/openapi.yaml`
- [ ] T038 [P] Verify all new Redis keys follow the `tenant:{id}:{type}:{id}` format documented in the constitution — grep `apps/` for any non-conformant key strings
- [ ] T039 Run end-to-end validation per `quickstart.md` — `docker compose up -d`, create appointment, verify Pending hash, verify Scheduled transition, verify occupied sorted set, verify occupied-times endpoint, verify Failed TTL
- [ ] T040 [P] Clean up deprecated `{tenantId}:AppointmentDetail:{id}` key writes from `AppointmentProcessor.cs` if not already removed in T014/T015

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Port Extensions)**: No dependencies — start immediately. T003 and T004 can run in parallel after T001/T002 complete.
- **Phase 2 (Cache Key Constants)**: No dependencies — can run in parallel with Phase 1.
- **Phase 3 (US1 — P1 MVP)**: Depends on Phase 1 + Phase 2 completion. T007–T009 (tests) can run in parallel with each other before T010–T016.
- **Phase 4 (US2)**: Depends on Phase 1 + Phase 2. T017–T018 (tests) parallel. T019–T020 parallel. T021 depends on T019; T022 depends on T020. Can run in parallel with Phase 5 after Phase 1+2 done.
- **Phase 5 (US4)**: Depends on Phase 1 + Phase 2 + T019/T020 (for occupancy key structure). T025–T026 parallel with each other. T029–T030 can start after T002+T006 complete.
- **Phase 6 (US3)**: Depends on Phase 3 (T013, T016 complete).
- **Phase 7 (Seed)**: Depends on Phase 1 (T001, T005); can be worked on in parallel with Phases 3–6.
- **Phase 8 (Integration Tests)**: Depends on Phase 1 completion (T003, T004).
- **Phase 9 (Polish)**: Depends on all prior phases complete.

### User Story Dependencies

- **US1 (P1)**: Foundational — delivers Pending hash + active endpoint. All other stories build on it.
- **US2 (P2)**: Depends on occupied-slots endpoints (T019–T022). Independent of US1 UI polling.
- **US4 (P2)**: Depends on US2 backend (T019–T022) for the key structures; Worker occupancy writes (T029–T030) can be done independently of US2 UI.
- **US3 (P3)**: Depends on US1 (active appointments endpoint T011–T012 and `getActiveAppointments` T013).

### Parallel Opportunities

```
# Phase 1 can overlap with Phase 2:
T001 + T002 → T003 [P], T004 [P]   (adapter implementations in parallel)
T005 + T006                          (cache key files, parallel with T001–T004)

# Within Phase 3 (US1):
T007 [P], T008 [P], T009 [P]        (unit tests, all in parallel)
T010, T011 [P], T014 [P], T015 [P]  (use case implementations, parallel where independent)

# After Phase 1+2 complete, Phases 3, 4, 5, 7, 8 can all start in parallel:
Developer A → Phase 3 (US1 API + Worker)
Developer B → Phase 4 (US2 API) + Phase 5 backend (T029–T030)
Developer C → Phase 8 (Integration tests)
```

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# Step 1: Write all unit tests in parallel (before implementation):
Task T007: "Write unit test for CreateAppointmentUseCase (Pending hash assertions)"
Task T008: "Write unit test for GetActiveAppointmentsUseCase"
Task T009: "Write unit test for AppointmentProcessor C# (status hash + TTL assertions)"

# Step 2: Implement in parallel where possible:
Task T010: "Modify CreateAppointmentUseCase to write Pending hash + active index"
Task T011: "Create GetActiveAppointmentsUseCase"
Task T014: "Update AppointmentProcessor success path — Scheduled hash write"
Task T015: "Update AppointmentProcessor failure path — Failed hash + TTL + index remove"

# Step 3: Wire routes and UI after use cases:
Task T012: "Add GET /active route to appointment.routes.ts"
Task T013: "Add getActiveAppointments() to api.ts"
Task T016: "Add polling to App.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1** (port extensions) + **Phase 2** (cache keys)
2. Complete **Phase 3** (US1 — Pending hash + active endpoint + UI polling)
3. **STOP and VALIDATE**: `docker compose up -d` → create appointment → verify Pending → Scheduled transition in UI without reload
4. Demo to stakeholders if ready

### Incremental Delivery

1. Setup (Phase 1+2) → Foundation ready
2. Phase 3 (US1) → Pending/Scheduled lifecycle live (**MVP**)
3. Phase 4 (US2) + Phase 5 backend (T029–T030) → Occupancy tracking + filtered dropdowns
4. Phase 5 UI (T027–T028) → Occupied time panel in modal
5. Phase 6 (US3) → Dashboard auto-refresh
6. Phase 7 (Seed) + Phase 8 (Integration tests) → Production hardening
7. Phase 9 (Polish) → Final cleanup

---

## Notes

- **[P]** = can run in parallel (different files, no shared dependency in this task set)
- **[USn]** = belongs to the given user story for traceability
- Every test must be run **explicitly by file** per the constitution's Test Execution Rules: `npx jest <file>` for Node.js; `dotnet test` for C#
- Avoid using `KEYS` command in any Redis call — use `SCAN` or the index Set approach documented in `research.md`
- All new Redis keys MUST follow `tenant:{tenant_id}:{type}:{id}` — validate with `CacheKeys.ts` / `CacheKeys.cs` helpers from Phase 2
- The existing temporary hold mechanism (`create-hold.use-case.ts`) is **untouched** by this feature
