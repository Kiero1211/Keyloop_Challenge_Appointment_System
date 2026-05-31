# API Contracts

## `POST /api/v1/appointments/hold`

Initiates a temporary hold on a technician and service bay.

**Request Body**:
```json
{
  "technicianId": "uuid-here",
  "serviceBayId": "uuid-here"
}
```

**Response (201 Created)**:
```json
{
  "holdId": "uuid-here",
  "expiresAt": "2026-05-31T18:40:00Z"
}
```

**Response (409 Conflict)**:
```json
{
  "error": "The selected technician or service bay is currently held by another user."
}
```

## `POST /api/v1/appointments` (Modifications)

**Request Body**:
```json
{
  "holdId": "uuid-here", // (Optional/Required depending on implementation, but likely required to verify the hold)
  "vehicleId": "uuid-here",
  "technicianId": "uuid-here",
  "serviceBayId": "uuid-here",
  "scheduledTime": "2026-05-31T18:00:00Z",
  "durationMinutes": 60
}
```

**Response (409 Conflict)**:
If the hold has expired, or the user submits a request without holding first.
```json
{
  "error": "The booking session has expired. Please re-create the booking session."
}
```
