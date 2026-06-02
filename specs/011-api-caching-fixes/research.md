# Research: API Caching and Small Fixes

## 1. Failed Appointments Tracking
**Decision**: The C# worker will catch processing exceptions and insert an appointment record with `Status = "Failed"` into the database. The API will support querying these failed appointments via a new status filter on the existing appointment list endpoint or a dedicated endpoint. 
**Rationale**: Storing failed appointments in the PostgreSQL database ensures they are queryable and visible alongside successful appointments, providing a single source of truth.
**Alternatives considered**: Using a separate DLQ or Redis-based failure log, which would be harder to query and integrate into the main UI.

## 2. Redis Cache for General Entities List
**Decision**: Implement new Set-based methods (`sadd`, `smembers`) in the API's `RedisCacheAdapter`. When querying a list of entities (e.g., technicians), the API will check a Redis Set (`tenant:{tenant_id}:{entity_type}s`). If empty, it fetches from the DB, stores the IDs in the Set, and stores individual entities as Redis Hashes (`tenant:{tenant_id}:{entity_type}:{id}`). Subsequent requests fetch IDs from the Set and data from the Hashes.
**Rationale**: This fulfills the requirement to use a Redis Set for tracking keys and Hashes for individual objects, reducing database load.
**Alternatives considered**: Storing the entire list as a serialized JSON string. Rejected because the spec explicitly mandates using Sets and Hashes.

## 3. Automatic Database Initialization
**Decision**: Add a startup sequence in the API's `main.ts` (or equivalent initialization block) to execute `seed/tables.sql` and `seed/seed.sql` using the existing PostgreSQL client.
**Rationale**: Ensures the database is always in a ready state when the API starts, fulfilling the requirement. 
**Alternatives considered**: Doing this via a separate Docker entrypoint script. Doing it in code ensures it can use the configured database connection pool and environment variables directly.

## 4. OpenAPI Specification Mismatch
**Decision**: Update `openapi.yaml` to exactly match `create-appointment.command.ts` and `AppointmentResponse`. This means modifying `AppointmentCreateRequest` to include `autoAssigned`, `technicianHolId`, and `serviceBayHoldId`, making `technicianId` and `serviceBayId` optional, and adding `Failed` to the `AppointmentResponse` status enum.
**Rationale**: The spec requires the OpenAPI file to match the current code.
**Alternatives considered**: Modifying the code to match the YAML. Rejected because the code reflects recent feature additions (like auto-assignment) which are intentional.
