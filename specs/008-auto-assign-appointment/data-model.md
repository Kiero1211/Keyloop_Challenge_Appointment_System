# Data Model: Auto Assign Appointment

## Entities

### Appointment Command / DTO
The payload received by the API service to create an appointment.

**New Fields:**
- `autoAssigned` (boolean): Flag indicating if the system should automatically assign a technician and service bay.

**Modified Fields:**
- `technicianId` (string, optional): Required if `autoAssigned` is false.
- `serviceBayId` (string, optional): Required if `autoAssigned` is false.
- `technicianHolId` (string, optional): Required if `autoAssigned` is false.
- `serviceBayHoldId` (string, optional): Required if `autoAssigned` is false.

## Validation Rules (API Layer - Zod)
- The API schema must conditionally validate the resource fields based on the `autoAssigned` flag.
- If `autoAssigned` is `false`, the resource fields are mandatory.
- If `autoAssigned` is `true`, the resource fields are optional (or ignored if provided).

## Domain Entities (Worker Service)

### Appointment (C# Entity)
- May need states to represent the assignment process if not processed instantly, or simply process it and transition directly to `Scheduled` or `Failed` (and sent to DLQ).

### Technician & Skills
- The worker service will need to query the database to join Technicians with their Skills and match against the required skills for the given `serviceTypeId`.
