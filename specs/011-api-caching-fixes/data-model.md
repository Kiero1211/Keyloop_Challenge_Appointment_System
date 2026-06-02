# Data Model: API Caching and Small Fixes

## 1. Appointment Entity Status
- `appointments.status`: Needs to support the `"Failed"` state to indicate processing/booking failure in the worker.

## 2. Redis Caching Structures (General Entities)
- **Keys Set (`tenant:{tenant_id}:{entity_type}s`)**: A Redis Set containing the IDs of all entities of a given type for a specific tenant.
- **Entity Hashes (`tenant:{tenant_id}:{entity_type}:{id}`)**: A Redis Hash storing the scalar fields of an individual entity object.

## 3. Database Initialization
- **`tables.sql`**: Contains `CREATE TABLE IF NOT EXISTS` statements for all entities.
- **`seed.sql`**: Contains `INSERT INTO ... ON CONFLICT DO NOTHING` statements for initial seed data (e.g., standard ServiceTypes, default Tenant).

## 4. OpenAPI Models
- **`AppointmentCreateRequest`**:
  - `customerId` (UUID, required)
  - `vehicleId` (UUID, required)
  - `serviceTypeId` (UUID, required)
  - `desiredStartTime` (ISO8601 DateTime, required)
  - `autoAssigned` (boolean, optional, default false)
  - `technicianHolId` (UUID, optional)
  - `serviceBayHoldId` (UUID, optional)
  - `technicianId` (UUID, optional)
  - `serviceBayId` (UUID, optional)
- **`AppointmentResponse`**:
  - `status` enum updated to `[Scheduled, InProgress, Completed, Cancelled, Failed]`
