# API Contracts

## `POST /api/v1/appointments` (or equivalent creation endpoint)

**Request Body Example (Auto Assign):**
```json
{
  "customerId": "uuid",
  "vehicleId": "uuid",
  "serviceTypeId": "uuid",
  "startTime": "2026-06-03T10:00:00Z",
  "endTime": "2026-06-03T11:00:00Z",
  "autoAssigned": true
  // Resource IDs omitted
}
```

**Request Body Example (Manual Assign):**
```json
{
  "customerId": "uuid",
  "vehicleId": "uuid",
  "serviceTypeId": "uuid",
  "startTime": "2026-06-03T10:00:00Z",
  "endTime": "2026-06-03T11:00:00Z",
  "autoAssigned": false,
  "technicianId": "uuid",
  "serviceBayId": "uuid",
  "technicianHolId": "uuid",
  "serviceBayHoldId": "uuid"
}
```

The Redis stream message payload will mirror these fields, passing the `autoAssigned` flag through to the worker service for processing.
