# Quickstart: Temporary Slot Hold

This feature introduces a 5-minute temporary slot hold in the Appointment API to block concurrent double bookings without relying on the slow downstream worker for concurrency checks.

## Key Concepts

1. **Temporary Hold**: Before confirming an appointment, the UI calls `POST /api/v1/appointments/hold` to reserve a technician and service bay for exactly 5 minutes.
2. **Hold Verification**: When the UI calls `POST /api/v1/appointments`, it passes the `holdId` (or the API checks for the existence of the hold cache implicitly). If the hold has expired or belongs to someone else, the request is rejected with a 409 Conflict.
3. **Vehicle Idempotency Removed**: Previously, the API blocked booking the same vehicle twice. This check has been removed, allowing a vehicle to have multiple appointments.

## Local Testing

1. Run `docker compose up -d` to start Redis and the API service.
2. Make a request to initiate a hold:
   ```bash
   curl -X POST http://localhost:3000/api/v1/appointments/hold \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: dealership-123" \
     -d '{ "technicianId": "tech-1", "serviceBayId": "bay-1" }'
   ```
3. Attempt the same request again. It should return a `409 Conflict`.
4. Wait 5 minutes. Attempt the request again. It should succeed (return `201 Created`).
