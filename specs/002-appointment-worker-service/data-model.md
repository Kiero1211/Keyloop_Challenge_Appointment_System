# Data Model: appointment-worker-service

## Domain Entities

### TrackingRecord
Persisted in PostgreSQL to represent a validated and scheduled appointment.
- `Id` (Guid, PK)
- `TenantId` (String, Indexed)
- `VehicleId` (String)
- `CustomerId` (String)
- `ServiceTypeId` (String)
- `ServiceBayId` (String)
- `TechnicianId` (String)
- `StartTime` (DateTimeOffset)
- `EndTime` (DateTimeOffset)
- `Status` (Enum: Pending, Confirmed, Rejected)
- `Version` (uint, Concurrency Token for OCC)

### AppointmentMessage (Value Object)
Payload consumed from Redis Streams.
- `TenantId` (String)
- `VehicleId` (String)
- `CustomerId` (String)
- `ServiceTypeId` (String)
- `DesiredStartTime` (DateTimeOffset)
- `Source` (String)

## Validation Rules

- `TenantId` cannot be null or empty.
- `StartTime` must be in the future.
- `ServiceBayId` and `TechnicianId` must be valid and confirmed entirely free by `bay-service`.

## State Transitions
1. `Pending` -> `Confirmed` (When external resources validate successfully and database saves without concurrency exception).
2. `Pending` -> `Rejected` (When resources are unavailable or a double-booking concurrency error occurs).
