# Data Model: Real-Time Appointment Booking

**Feature**: `014-realtime-booking`

---

## Redis Data Structures

### 1. Appointment Hash (shared between API and Worker)

**Key pattern**: `tenant:{tenant_id}:appointment:{appointment_id}`
**Type**: Redis Hash
**Owner**: Written first by API (status=Pending), updated by Worker (status=Scheduled|Failed)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Appointment ID (same as key suffix) |
| `tenant_id` | string (UUID) | Tenant identifier |
| `customer_id` | string (UUID) | Customer |
| `vehicle_id` | string (UUID) | Vehicle |
| `service_type_id` | string (UUID) | Service type |
| `technician_id` | string (UUID) | Assigned technician |
| `service_bay_id` | string (UUID) | Assigned service bay |
| `start_time` | ISO 8601 string | Scheduled start |
| `end_time` | ISO 8601 string | Scheduled end |
| `status` | string | `Pending` \| `Scheduled` \| `Failed` |
| `notes` | string | Worker-set notes on failure or success |
| `actual_start_time` | ISO 8601 string \| empty | Set when InProgress |
| `actual_end_time` | ISO 8601 string \| empty | Set when Completed |
| `created_at` | ISO 8601 string | Creation timestamp |
| `updated_at` | ISO 8601 string | Last update timestamp |

**TTL rules**:
- `Pending` / `Scheduled`: no TTL (persists until explicit removal)
- `Failed`: TTL = 3600 seconds (1 hour)

---

### 2. Active Appointments Index (Set)

**Key pattern**: `tenant:{tenant_id}:appointments:active`
**Type**: Redis Set
**Members**: appointment IDs (`{appointment_id}` string)

Used by the active appointments query to avoid a full key scan. The API adds an ID on creation, and the Worker removes it on `Failed` (after TTL, it auto-expires) or explicitly on terminal states.

---

### 3. Resource Occupancy Sorted Set (per Technician or Bay)

**Key patterns**:
- `tenant:{tenant_id}:technician:{technician_id}:occupied`
- `tenant:{tenant_id}:bay:{service_bay_id}:occupied`

**Type**: Redis Sorted Set
**Score**: `start_time` as Unix timestamp (seconds, UTC)
**Member**: `appointment_id` (UUID string)

Allows range queries: find all appointment IDs whose `start_time` falls within a window.

---

### 4. Occupied Slot Companion Hash

**Key pattern**: `tenant:{tenant_id}:occupied_slot:{appointment_id}`
**Type**: Redis Hash

| Field | Type | Description |
|-------|------|-------------|
| `appointment_id` | string (UUID) | Matches the sorted set member |
| `start_time` | ISO 8601 string | Start of occupied window |
| `end_time` | ISO 8601 string | End of occupied window |

Used by the occupied-times API endpoints to hydrate the slot details after querying the sorted set.

**Lifecycle**:
- **Written** by Worker when appointment → `Scheduled`
- **Deleted** by Worker when appointment → `Completed` or `Cancelled`

---

## State Transitions

```
[API: POST /appointments]
    │
    ▼
Write appointment hash: status=Pending
Add appointment_id to active index set
Publish message to Redis Stream
    │
    ▼
[Worker: AppointmentProcessor]
    ├── Success ──────────────────────────────────────────────────────┐
    │   Write appointment record to DB (status=Scheduled)             │
    │   Update appointment hash: status=Scheduled, notes              │
    │   ZADD technician occupied sorted set                           │
    │   ZADD bay occupied sorted set                                  │
    │   HSET companion hash: appointmentId, startTime, endTime        │
    │                                                                 │
    └── Failure ──────────────────────────────────────────────────┐  │
        Write failed record to DB (status=Failed)                 │  │
        Update appointment hash: status=Failed, notes             │  │
        Set TTL on appointment hash = 3600s                       │  │
        Remove appointment_id from active index set               │  │
        (no occupancy entries written for Failed)                 ▼  ▼

[Worker: UpdateAppointmentStatus → Completed | Cancelled]
    ZREM technician occupied sorted set
    ZREM bay occupied sorted set
    DEL companion hash
    Remove appointment_id from active index set
```

---

## API Contracts (New / Modified)

### New: `POST /api/v1/appointments` (modified side effect)
After publishing to stream, also write appointment hash with `status=Pending` + add to active index set. No change to request/response shape.

### New: `GET /api/v1/appointments/active`
Returns all appointments from cache where `status IN (Pending, Scheduled)`.

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "customerId": "uuid",
      "vehicleId": "uuid",
      "serviceTypeId": "uuid",
      "technicianId": "uuid",
      "serviceBayId": "uuid",
      "startTime": "ISO8601",
      "endTime": "ISO8601",
      "status": "Pending | Scheduled",
      "notes": "string | null",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

### New: `GET /api/v1/technicians/:id/occupied`
Returns occupied time windows for a technician from the occupancy sorted set.

**Query params**: `date` (ISO 8601 date, default today)

**Response**:
```json
{
  "technicianId": "uuid",
  "occupiedSlots": [
    {
      "appointmentId": "uuid",
      "startTime": "ISO8601",
      "endTime": "ISO8601"
    }
  ]
}
```

### New: `GET /api/v1/service-bays/:id/occupied`
Returns occupied time windows for a service bay.

**Response** (same shape as technician, replacing `technicianId` with `serviceBayId`):
```json
{
  "serviceBayId": "uuid",
  "occupiedSlots": [
    {
      "appointmentId": "uuid",
      "startTime": "ISO8601",
      "endTime": "ISO8601"
    }
  ]
}
```

---

## ICacheProvider Extension Points

### Node.js Port Extensions (appointment-api-service)

```typescript
// Additional methods required in ICacheProvider
zadd(key: string, score: number, member: string): Promise<number>;
zrem(key: string, member: string): Promise<number>;
zrangebyscore(key: string, min: number | '-inf', max: number | '+inf'): Promise<string[]>;
```

### C# Port Extensions (appointment-worker-service)

```csharp
// Additional methods required in ICacheProvider
Task HashSetFieldsAsync(string key, Dictionary<string, string> fields, TimeSpan? ttl = null);
Task SortedSetAddAsync(string key, string member, double score);
Task SortedSetRemoveAsync(string key, string member);
Task SortedSetAddWithCompanionAsync(
    string setKey, string member, double score,
    string companionKey, Dictionary<string, string> companionFields);
Task SortedSetRemoveWithCompanionAsync(string setKey, string member, string companionKey);
Task SetAddAsync(string key, string member);
Task SetRemoveAsync(string key, string member);
Task<IEnumerable<string>> SetMembersAsync(string key);
```
