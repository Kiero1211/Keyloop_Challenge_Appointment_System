# Quickstart: Multi-Tenant API — Developer Guide

**Branch**: `003-multi-tenant-api` | **Date**: 2026-05-30

---

## Prerequisites

- Node.js 20 LTS
- Docker + Docker Compose
- `pnpm` (monorepo package manager)

---

## 1. Start Infrastructure

```bash
# From repo root — boots PostgreSQL + Redis
docker compose up -d postgres redis
```

Wait for health checks to pass:
```bash
docker compose ps   # postgres and redis should show "healthy"
```

---

## 2. Set Environment Variables

Copy `.env.example` in `apps/appointment-api-service/`:

```bash
cp apps/appointment-api-service/.env.example apps/appointment-api-service/.env
```

Key variables:
```env
PORT=3000
DATABASE_URL=postgresql://keyloop:keyloop@localhost:5432/keyloop
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-dev-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 3. Run Database Migrations

```bash
cd apps/appointment-api-service
pnpm db:migrate
```

This applies the Drizzle migration files in `src/infrastructure/db/migrations/`.

---

## 4. Start the API Service

```bash
cd apps/appointment-api-service
pnpm dev
```

API available at: `http://localhost:3000/api/v1`

---

## 5. Typical First-Run Flow

### Step 1 — Register a user and tenant

```bash
# Create a tenant (requires an Admin token — seed one first or use dev bypass)
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Speedy Auto Repair", "contactEmail": "manager@speedy.com"}'
# → { "id": "TENANT_UUID", "name": "Speedy Auto Repair", ... }

# Register a TenantUser for that tenant
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "advisor@speedy.com",
    "password": "SecurePass123!",
    "firstName": "Alice",
    "lastName": "Smith",
    "tenantId": "TENANT_UUID"
  }'
# → { "accessToken": "...", "refreshToken": "...", "currentTenant": { ... } }
```

### Step 2 — Make authenticated requests

```bash
export ACCESS_TOKEN="<accessToken from login>"
export TENANT_ID="<tenantId>"

# Create a ServiceType
curl -X POST http://localhost:3000/api/v1/service-types \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"name": "Oil Change", "estimatedDurationMinutes": 45}'

# Create a Technician
curl -X POST http://localhost:3000/api/v1/technicians \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Bob", "lastName": "Jones", "email": "bob@speedy.com"}'
```

### Step 3 — Refresh token when access token expires

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<your refresh token>"}'
# → { "accessToken": "new short-lived token" }
```

### Step 4 — Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<your refresh token>"}'
# → 200 OK (refresh token is now revoked)
```

---

## 6. Key Headers

| Header | Required On | Value |
|---|---|---|
| `Authorization` | All protected routes | `Bearer <accessToken>` |
| `x-tenant-id` | All tenant-scoped routes | UUID of your tenant |
| `Content-Type` | POST / PUT / PATCH | `application/json` |

---

## 7. Error Response Format

All errors follow this structure:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    { "field": "endTime", "message": "end_time must be after start_time" }
  ]
}
```

Common codes:

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing/invalid/expired JWT |
| `FORBIDDEN` | 403 | x-tenant-id mismatch or insufficient role |
| `BAD_REQUEST` | 400 | Missing header or validation failure |
| `NOT_FOUND` | 404 | Resource does not exist in this tenant |
| `CONFLICT` | 409 | Uniqueness violation or double-booking |
| `UNPROCESSABLE` | 422 | Cross-tenant reference or invalid state transition |

---

## 8. Running Tests

```bash
cd apps/appointment-api-service

# Unit tests (no external dependencies)
pnpm test:unit

# Integration tests (requires Docker for Testcontainers)
pnpm test:integration

# All tests
pnpm test
```

---

## 9. OpenAPI Documentation

The full contract is at:
- File: [`specs/003-multi-tenant-api/contracts/openapi.yaml`](./contracts/openapi.yaml)
- Interactive (Swagger UI): `http://localhost:3000/api/docs` (when service is running with `pnpm dev`)

---

## 10. Authorization Note on Existing Appointment Ingestion Route

The existing high-throughput ingestion route at `POST /api/v1/appointments` (Redis Stream path) **does not have JWT middleware** in the current codebase — the `x-tenant-id` header is read but no JWT is verified. This plan adds `jwtAuthMiddleware` before `tenantContextMiddleware` on that route as part of the implementation tasks.
