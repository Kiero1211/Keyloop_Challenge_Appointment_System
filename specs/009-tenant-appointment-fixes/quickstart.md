# Quickstart: Tenant Appointment Fixes

## Testing Multi-Day Queries
To test the newly added availability queries spanning multiple days:
1. Schedule a few appointments spanning consecutive days (e.g., Monday and Tuesday).
2. Hit the `GET /api/technicians/available?startTime=...&endTime=...` using a time block that spans the entire week.
3. Verify that the scheduled technicians are omitted if the time frames overlap.

## Testing Tenant Roles and Switching
1. Register a new user without a `tenantId`. Verify they are a `Guest`.
2. As a `TenantManager`, assign the Guest to your tenant.
3. Verify the Guest can now see tenant data.
4. Call `POST /api/auth/switch-tenant` passing `{ "targetTenantId": "..." }`.
5. Verify the new JWT token has the updated tenant, and `users.lastActiveTenantId` is updated in the database.
