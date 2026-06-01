# Data Model: API Redis Cache

## Entities

### Appointment (Domain Model Update)

The Appointment status union type in TypeScript and enum in C# will be restricted.

**TypeScript (`AppointmentStatus` type)**:
```typescript
export type AppointmentStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
```

**C# (`AppointmentStatus` enum)**:
```csharp
public enum AppointmentStatus
{
    Scheduled,
    InProgress,
    Completed,
    Cancelled
}
```

### Cache Representation (Redis Hash)

All entities will be serialized into Redis Hashes.
For example, an appointment:

**Key**: `tenant:{tenant_id}:appointment:{appointment_id}`

**Fields** (Schema must match DB schema exactly, plus denormalized properties):
- `id`: string
- `tenant_id`: string
- `customer_id`: string
- `customer_data`: string (JSON string of full customer object)
- `vehicle_id`: string
- `vehicle_data`: string (JSON string of full vehicle object)
- `technician_id`: string
- `technician_data`: string (JSON string of full technician object)
- `service_bay_id`: string
- `service_bay_data`: string (JSON string of full service bay object)
- `status`: string ('Scheduled' | 'InProgress' | 'Completed' | 'Cancelled')
- `scheduled_time`: string (ISO 8601)
- `created_at`: string (ISO 8601)
- `updated_at`: string (ISO 8601)

**TTL Rules (Appointments only)**:
- If `status` is `'Completed'` or `'Cancelled'`: TTL = 21600 seconds (6 hours).
- If `status` is `'Scheduled'` or `'InProgress'`: No TTL (persistent cache).

**General Entities**:
- All other entities (e.g., Customer, Vehicle) will use the same key structure: `tenant:{tenant_id}:{entity_name}:{id}`.
- They will be stored as Redis Hashes.
- TTL: Appropriate default TTL (e.g., 24 hours).
