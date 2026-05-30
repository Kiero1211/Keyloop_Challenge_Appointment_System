# Appointment API Service

This is the backend service handling appointments, customers, technicians, and multi-tenant logic.

## Environment Variables
Ensure you have the following configured in your `.env`:
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: Secret key for signing JWTs.
- `JWT_ACCESS_EXPIRES_IN`: E.g., `1h`
- `JWT_REFRESH_EXPIRES_IN`: E.g., `7d`
- `REDIS_URL`: Redis connection URL.

## Getting Started
See [quickstart.md](../../specs/003-multi-tenant-api/quickstart.md) for full instructions on setting up and testing.
