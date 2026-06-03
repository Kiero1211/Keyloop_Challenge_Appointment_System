# Research: Real-Time Appointment Booking

**Feature**: `014-realtime-booking`
**Branch**: `014-realtime-booking`

---

## 1. Shared Appointment Hash Cache (API ↔ Worker)

### Decision
Use Redis **Hash** (`HSET` / `HGETALL`) keyed as `tenant:{tenant_id}:appointment:{appointment_id}`. Fields mirror the `appointments` DB table exactly: `id`, `tenant_id`, `customer_id`, `vehicle_id`, `service_type_id`, `technician_id`, `service_bay_id`, `start_time`, `end_time`, `status`, `notes`, `actual_start_time`, `actual_end_time`, `created_at`, `updated_at`.

### Rationale
- The `ICacheProvider` (Node.js) already exposes `hset` / `hgetall`. The C# `CacheProvider` exposes `SetAsync<T>` which serializes to a hash via JSON→dict→HashEntry. Both sides can read/write the same key structure.
- Hashes are cheaper than storing a full JSON string; individual fields can be updated atomically (e.g., only `status` and `notes`) without rewriting all fields.
- The current `AppointmentProcessor.cs` writes to `{tenantId}:AppointmentDetail:{id}` — this must be **migrated** to the canonical `tenant:{tenant_id}:appointment:{appointment_id}` key format required by the constitution.

### Alternatives considered
- Storing JSON string under a plain `SET` key: rejected because it requires full rewrite on every field update and loses the ability to do `HSET field value` partial updates.

---

## 2. Appointment Status Lifecycle in Cache

### Decision
- **API Service** (`CreateAppointmentUseCase`): after publishing to the stream, write the appointment hash with `status = Pending` (current code sets `status = Scheduled` in the payload — this must be corrected). The appointment `id` (commandId) is known at this point and becomes the cache key.
- **Worker Service** (`AppointmentProcessor.cs`): after successful DB persist → overwrite `status = Scheduled` + `notes`. On failure → overwrite `status = Failed` + set TTL = 3600 s.

### Gap identified
The current `create-appointment.use-case.ts` does **not** write an appointment hash to Redis after publishing. This is a new addition required by this feature.

The current `AppointmentProcessor.cs` writes to a non-conformant key (`{tenantId}:AppointmentDetail:{id}`) and uses JSON wrapping (`new { appointment = record }`). Both must be updated.

---

## 3. Resource Occupancy Structure in Redis

### Decision
Use a Redis **Sorted Set** (`ZADD` / `ZRANGEBYSCORE`) per resource, where:
- **Key**: `tenant:{tenant_id}:technician:{technician_id}:occupied` or `tenant:{tenant_id}:bay:{service_bay_id}:occupied`
- **Member**: `appointment_id` (string UUID)
- **Score**: `start_time` as a Unix timestamp (seconds), enabling range queries by time.

To retrieve the full slot info (start + end), a companion Hash per occupied slot is stored at `tenant:{tenant_id}:occupied_slot:{appointment_id}` with fields `appointment_id`, `start_time`, `end_time`. This avoids encoding composite values in the sorted set member string.

### Rationale
- A sorted set allows O(log N) range queries: "find all entries where score (start_time) < requested_end_time" to detect overlaps.
- The per-slot hash provides all three fields (id, start, end) the UI needs to display the occupied time frame without a DB round trip.

### Alternatives considered
- **Redis List**: no random removal by value; rejected.
- **Redis Set of JSON strings**: no range queries; rejected.
- **Single JSON array per resource**: requires read-modify-write; not atomic; rejected.
- **Sorted Set with composite member (`appointmentId|start|end`)**: works but is awkward to parse. Separate companion hash is cleaner.

### Lifecycle
- `Scheduled` → worker calls `ZADD` + `HSET` for companion hash.
- `Completed` or `Cancelled` → worker calls `ZREM` + `DEL` companion hash.

---

## 4. Active Appointments Query (Pending + Scheduled)

### Decision
The API exposes `GET /api/v1/appointments/active` which scans the Redis key pattern `tenant:{tenant_id}:appointment:*` using `SCAN` (not `KEYS`) and returns all hashes where `status IN (Pending, Scheduled)`.

### Rationale
- `SCAN` is non-blocking and safe in production. `KEYS` is O(N) and blocks the Redis event loop.
- To avoid the O(N) scan on every poll, an **index set** is maintained: `tenant:{tenant_id}:appointments:active` (Redis Set). The API adds the appointment key to this set when writing `Pending`, the worker removes it when the status becomes terminal (`Failed`, after TTL). A Failed entry remains in the set until TTL evicts the key, but `HGETALL` returns `null` for evicted keys (handled gracefully).

### Alternatives considered
- Storing appointment IDs in a Redis List: no O(1) removal by value.
- Full table scan of DB: defeats the caching purpose.

---

## 5. Occupied Times API Endpoints

### Decision
Two new endpoints added to the API service under `appointment.routes.ts`:
- `GET /api/v1/technicians/:id/occupied` — returns array of `{ appointmentId, startTime, endTime }` from the sorted set + companion hashes.
- `GET /api/v1/service-bays/:id/occupied` — same pattern for bays.

These endpoints read from Redis only (no DB fallback in normal operation). On cold start, a seed job re-populates from the DB.

---

## 6. UI Polling Strategy

### Decision
The `api-client-ui` (React/Vite) will use `setInterval` hooks at 4-second intervals:
- **Dashboard polling**: while the appointments tab is active, poll `GET /api/v1/appointments/active`.
- **Modal polling**: while the create appointment modal is open AND a technician or bay is selected, poll `GET /api/v1/technicians/:id/occupied` and/or `GET /api/v1/service-bays/:id/occupied` for the selected resource.

Polling stops when the modal is closed or the tab changes, using `useEffect` cleanup.

---

## 7. ICacheProvider Extensions Required

### Node.js (`ICacheProvider` port)
New methods needed:
- `scan(pattern: string): Promise<string[]>` — for pattern-based key discovery (used for the index set approach, but actually not needed if we use the index set)
- `zadd(key: string, score: number, member: string): Promise<number>`
- `zrem(key: string, member: string): Promise<number>`
- `zrangebyscore(key: string, min: number, max: number): Promise<string[]>`

These must be added to the port interface and implemented in `RedisCacheAdapter`.

### C# (`ICacheProvider` port)
New methods needed:
- `HashSetFieldsAsync(string key, Dictionary<string, string> fields, TimeSpan? ttl = null)` — for partial hash updates (only `status` + `notes`).
- `SortedSetAddAsync(string key, string member, double score)` 
- `SortedSetRemoveAsync(string key, string member)`

These must be added to `ICacheProvider.cs` and implemented in `CacheProvider.cs`.

---

## 8. Cold-Start Re-seeding

### Decision
On API service startup, a `StartupSeedService` queries the DB for all `Scheduled` appointments (per tenant) and writes:
1. The appointment hash for each.
2. The occupancy sorted set + companion hashes for each.
3. Adds each appointment ID to the active index set.

This is implemented as an Express startup hook (called in `app.ts` before accepting traffic).

---

## 9. Constitution Compliance

| Check | Status |
|-------|--------|
| Service boundary: API only writes cache + publishes stream, no DB | ✅ The API service does not add DB access |
| Service boundary: Worker owns all DB persistence | ✅ Worker writes DB then updates cache |
| Cache key format `tenant:{id}:{type}:{id}` | ✅ Enforced for all new keys |
| Tenant isolation: all keys prefixed with tenant_id | ✅ |
| Port abstraction: no Redis client leaks to application layer | ✅ New methods added to port interfaces |
| TDD: all new use cases have unit tests | ✅ Required in tasks |
| No HTTP endpoints in worker | ✅ Worker only touches Redis + DB |
