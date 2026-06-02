# Quickstart: Real-Time Appointment Booking

**Feature**: `014-realtime-booking`
**Branch**: `014-realtime-booking`

---

## What This Feature Changes

This feature introduces three layers of real-time data flowing through Redis:

1. **Appointment status cache** — every appointment has a Redis Hash that transitions `Pending → Scheduled | Failed`, written jointly by the API and the Worker.
2. **Resource occupancy tracking** — each technician and service bay has a Redis Sorted Set tracking their booked time windows, maintained exclusively by the Worker.
3. **UI polling** — the `api-client-ui` polls two new families of endpoints and updates in real time while the create-appointment modal is open.

---

## Services Touched

| Service | Language | What changes |
|---------|----------|-------------|
| `appointment-api-service` | TypeScript | New cache writes in `CreateAppointmentUseCase`; new routes for `/active`, `/technicians/:id/occupied`, `/service-bays/:id/occupied`; extended `ICacheProvider` port; startup seed job |
| `appointment-worker-service` | C# .NET 8 | Updated `AppointmentProcessor` to write appointment hash + occupancy entries; extended `ICacheProvider` interface and `CacheProvider` adapter |
| `api-client-ui` | TypeScript/React | New polling hooks; occupied time display panel in create appointment modal |

---

## Key Redis Structures

| Key | Type | Writer | Reader |
|-----|------|--------|--------|
| `tenant:{t}:appointment:{a}` | Hash | API (Pending), Worker (Scheduled/Failed) | API `/active`, UI |
| `tenant:{t}:appointments:active` | Set | API (add), Worker (remove on Failed) | API `/active` |
| `tenant:{t}:technician:{tech}:occupied` | Sorted Set | Worker (add on Scheduled, remove on Completed/Cancelled) | API `/technicians/:id/occupied` |
| `tenant:{t}:bay:{bay}:occupied` | Sorted Set | Worker (add on Scheduled, remove on Completed/Cancelled) | API `/service-bays/:id/occupied` |
| `tenant:{t}:occupied_slot:{a}` | Hash | Worker | API (hydration) |

---

## Implementation Sequence

### Step 1 — Extend `ICacheProvider` interfaces

**Node.js** (`apps/appointment-api-service/src/application/ports/cache-provider.port.ts`):
Add `zadd`, `zrem`, `zrangebyscore`, `sadd` (already exists), `smembers` (already exists), `srem`.

**C#** (`apps/appointment-worker-service/src/Core/Application/Ports/ICacheProvider.cs`):
Add `HashSetFieldsAsync`, `SortedSetAddAsync`, `SortedSetRemoveAsync`, `SetAddAsync`, `SetRemoveAsync`, `SetMembersAsync`.

### Step 2 — Implement new port methods in adapters

**Node.js** (`RedisCacheAdapter.ts`): implement `zadd`, `zrem`, `zrangebyscore`, `srem`.

**C#** (`CacheProvider.cs`): implement the above methods using `StackExchange.Redis`.

### Step 3 — Update `CreateAppointmentUseCase` (API)

After `messagePublisher.publish(...)`:
1. Write appointment hash with all fields + `status=Pending`.
2. Add appointment ID to `tenant:{t}:appointments:active` set.

The `commandId` (already generated) becomes the appointment ID in the cache key.

### Step 4 — Update `AppointmentProcessor` (Worker)

**On success (Scheduled)**:
1. Update appointment hash: `status=Scheduled`, `notes`, `updated_at` (partial HSET).
2. `ZADD` technician + bay sorted sets.
3. `HSET` companion hash for each.

**On failure (Failed)**:
1. Update appointment hash: `status=Failed`, TTL=3600s.
2. `SREM` appointment ID from active index set.

**On Completed/Cancelled** (triggered via status update flow):
1. `ZREM` from technician + bay sorted sets.
2. `DEL` companion hashes.
3. `SREM` from active index set.

### Step 5 — New API routes

Add to `appointment.routes.ts`:
- `GET /active` → `GetActiveAppointmentsUseCase`

Add to `technicians.routes.ts`:
- `GET /:id/occupied` → `GetTechnicianOccupiedSlotsUseCase`

Add to `service-bays.routes.ts`:
- `GET /:id/occupied` → `GetBayOccupiedSlotsUseCase`

### Step 6 — New use cases (API)

- `GetActiveAppointmentsUseCase`: reads active index set, HGETALL each appointment hash, filters by status.
- `GetTechnicianOccupiedSlotsUseCase`: `ZRANGEBYSCORE` on technician sorted set (day range), HGETALL each companion hash.
- `GetBayOccupiedSlotsUseCase`: same as above for bay.

### Step 7 — Startup seed job (API)

`StartupSeedService.ts`: on server start, query the DB for all `Scheduled` appointments (via existing `appointmentCrudRepository`), write their hashes + occupancy entries + active index.

### Step 8 — UI changes (`api-client-ui`)

- Add `getActiveAppointments()` and `getOccupiedSlots(type, id)` to `api.ts`.
- Update `App.tsx` / appointment tab to poll `getActiveAppointments` every 4 seconds.
- In the create appointment modal, when a technician or bay is selected, start polling `getOccupiedSlots` and display the result as a list of booked time windows.

---

## Testing Checklist (per constitution)

- [ ] Unit tests for `CreateAppointmentUseCase` (mock `ICacheProvider` — verify `hset` + `sadd` called with Pending status)
- [ ] Unit tests for `GetActiveAppointmentsUseCase` (mock `ICacheProvider`)
- [ ] Unit tests for `GetTechnicianOccupiedSlotsUseCase` / `GetBayOccupiedSlotsUseCase`
- [ ] Unit tests for `AppointmentProcessor.cs` (mock `ICacheProvider` — verify ZADD/HSET/ZREM/DEL on each transition)
- [ ] Integration tests for new API routes (Testcontainers Redis)
- [ ] Integration tests for `CacheProvider.cs` new methods (Testcontainers Redis)

---

## Local Dev Verification

```bash
# Start all services
docker compose up -d

# Create an appointment
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant_id>" \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# Immediately check the appointment hash in Redis (should be Pending)
docker exec keyloop-redis-1 redis-cli HGETALL "tenant:<t>:appointment:<commandId>"

# Poll active appointments
curl http://localhost:3000/api/v1/appointments/active \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant_id>"

# After worker processes it, check occupancy
curl http://localhost:3000/api/v1/technicians/<tech_id>/occupied \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant_id>"
```
