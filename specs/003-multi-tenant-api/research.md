# Research: Multi-Tenant API — Phase 0 Findings

**Branch**: `003-multi-tenant-api` | **Date**: 2026-05-30

---

## 1. Existing Codebase Audit

### 1.1 What Already Exists (Do Not Duplicate)

| Component | File | Status |
|---|---|---|
| `x-tenant-id` header reading | `tenant-context.middleware.ts` | ✅ Done — reads header, stores in `AsyncLocalStorage` |
| `tenantContext` (`AsyncLocalStorage`) | `domain/context/tenant-context.ts` | ✅ Done |
| `CreateAppointmentUseCase` | `application/use-cases/create-appointment.use-case.ts` | ✅ Done — uses `tenantContext`, idempotency, Redis Stream publish |
| Redis cache port + adapter | `infrastructure/cache/` | ✅ Done |
| Redis stream publisher | `infrastructure/messaging/` | ✅ Done |
| Error handler middleware | `infrastructure/http/middleware/error-handler.middleware.ts` | ✅ Done — handles Zod, DomainValidation, Duplicate |
| DI container | `infrastructure/di/container.ts` | ✅ Done — needs extension |

### 1.2 Authorization Gap Found (FR-031 Note)

The `POST /api/v1/appointments` route in `app.ts`:
```
app.use('/api/v1/appointments', tenantContextMiddleware, appointmentRouter);
```
- ✅ `tenantContextMiddleware` reads `x-tenant-id` header
- ❌ **No JWT authentication middleware is applied** — the endpoint is publicly callable without a Bearer token
- The spec note on FR-031 ("check if it is missing authorization") confirms: **JWT middleware is missing from the existing appointment route**
- **Action**: Add `jwtAuthMiddleware` before `tenantContextMiddleware` on the appointment route (and all new routes)

### 1.3 Create Appointment — Double-Booking Logic

The `CreateAppointmentUseCase` does NOT perform overlap detection itself — it:
1. Checks Redis idempotency key (`tenant:{id}:appointment:{vehicleId}:pending`) — prevents re-submission of same vehicle
2. Publishes to Redis Stream — the **worker service** does the actual overlap/double-booking check

FR-031 double-booking detection lives in `appointment-worker-service` (already implemented per `spec/002`). The API service's role is ingestion only. No new overlap logic needed in the API service; the authorization gap is the only action required.

---

## 2. JWT Token Pattern (from `auth-service` study)

### Decision: Mirror the existing auth-service pattern, framework-agnostic

**Access token payload**:
```json
{
  "sub": "uuid-user-id",
  "tenant_id": "uuid-tenant-id | null",
  "role": "Admin | TenantUser",
  "permissions": ["customers.read", "bookings.create"],
  "isSuperAdmin": false,
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh token**:
- Opaque UUID string stored as a server-side `refresh_tokens` table row
- Fields: `id`, `user_id`, `tenant_id`, `token` (UUID), `expires_at` (UTC +7 days), `is_revoked`, `ip_address`, `user_agent`, `created_at`
- Revoked on `/auth/logout` by setting `is_revoked = true`

**Rationale**: Matches the existing auth-service implementation exactly, enabling future token interoperability. No new JWT library decisions needed.

**Alternatives considered**:
- Opaque sessions in Redis — rejected; stateful session management conflicts with the stateless JWT approach already used project-wide
- Long-lived single tokens — rejected; security risk, no revocation support

---

## 3. `x-tenant-id` Header Validation Pattern

### Decision: Add JWT cross-check to existing `tenantContextMiddleware`, or add a new `jwtAuthMiddleware` that validates both

**Chosen approach**: Two-middleware chain per protected route:
1. `jwtAuthMiddleware` — verifies Bearer token, attaches `req.user` with `{ sub, tenant_id, role, permissions, isSuperAdmin }`
2. `tenantContextMiddleware` — reads `x-tenant-id` header; cross-checks against `req.user.tenant_id` (unless `isSuperAdmin`); stores in `AsyncLocalStorage`

**Why two separate middlewares**: Separation of concerns — JWT auth and tenant context are independent concerns; health checks need neither; auth endpoints (`/auth/*`) need JWT auth but not tenant context.

**Rationale**: Matches constitution Principle III: "tenant_id MUST be propagated via AsyncLocalStorage" and "every HTTP request payload MUST be validated for the presence of a non-empty tenant_id."

---

## 4. ORM Choice for PostgreSQL CRUD

### Decision: **Drizzle ORM**

- **Rationale**: Drizzle is TypeScript-first, generates type-safe queries, and has minimal abstraction overhead — closest to the "Dapper for raw performance" spirit mentioned in the constitution. Schema is defined in plain TypeScript; migrations are SQL files.
- **Alternative considered**: TypeORM — heavier, decorator-heavy (more NestJS-style); Prisma — generates its own client binary, adds complexity; raw `pg` — too verbose for 8 entities with full CRUD.
- **Constitution fit**: Drizzle adapters implement the `IXxxRepository` Port interfaces defined in the Application layer — full Hexagonal compliance.

---

## 5. Multi-Tenant Query Isolation Pattern

### Decision: Explicit `WHERE tenant_id = ?` on every query via repository port

**Pattern**:
```typescript
// All repository methods receive tenantId from AsyncLocalStorage internally
class DrizzleCustomerRepository implements ICustomerRepository {
  async findAll(): Promise<Customer[]> {
    const { tenantId } = tenantContext.getStore()!;
    return db.select().from(customers).where(eq(customers.tenantId, tenantId));
  }
}
```

**Why not Drizzle middleware/global filter**: Drizzle does not have a built-in global query filter equivalent to EF Core's. Explicit `WHERE` per query is more auditable and testable.

**Alternative considered**: PostgreSQL Row-Level Security (RLS) policies — rejected for v1 as they require session variable setup on each connection, which adds complexity to the connection pool management. Explicit WHERE is simpler and auditable.

---

## 6. Token Refresh & Revocation

### Decision: Store refresh tokens in PostgreSQL, not Redis

**Rationale**: Refresh tokens have a 7-day TTL and need reliable persistence across restarts. Redis is used for ephemeral idempotency keys (short-lived). Using the same Drizzle PostgreSQL infrastructure for refresh tokens is consistent and simplifies the architecture.

**Pattern**: On `POST /auth/refresh`:
1. Look up token in DB: `WHERE token = ? AND is_revoked = false AND expires_at > NOW()`
2. Generate new access token
3. Do NOT rotate the refresh token (avoids race conditions on mobile clients)
4. On `POST /auth/logout`: `UPDATE refresh_tokens SET is_revoked = true WHERE token = ?`

---

## 7. Appointment Status State Machine (CRUD Update)

The existing `create-appointment` use case only handles intake (publishes to Redis Stream). For the CRUD `/appointments` layer (read, update status, cancel), a separate repository-backed path is needed that reads from/writes to PostgreSQL.

**State transitions** (from spec FR-034):
```
PENDING → CONFIRMED → COMPLETED
PENDING → CANCELLED
CONFIRMED → CANCELLED
```
Invalid transitions return `422 Unprocessable Entity`.

**Implementation**: The appointment status update use case reads the current status from PostgreSQL and validates the transition before writing.

---

## 8. `isSuperAdmin` Bypass

**Pattern**: In `tenantContextMiddleware`, after JWT validation:
```typescript
if (req.user.isSuperAdmin) {
  // Skip x-tenant-id === JWT tenant_id check
  // Still require x-tenant-id header (to scope the query target)
  tenantContext.run({ tenantId: req.headers['x-tenant-id'], userId: req.user.sub, role: req.user.role, isSuperAdmin: true }, next);
} else {
  // Validate header matches JWT claim
  if (req.headers['x-tenant-id'] !== req.user.tenant_id) → 403
}
```

---

## 9. docker-compose.yml Update

PostgreSQL must be added to the root `docker-compose.yml` for the CRUD entities. The worker service already writes to PostgreSQL; this plan adds the schema migrations for the new tables.

**Action**: Add `postgres` service with health check, expose port 5432, add `DATABASE_URL` env var to `appointment-api-service`.
