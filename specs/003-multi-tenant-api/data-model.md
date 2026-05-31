# Data Model: Multi-Tenant Vehicle Service Appointment API

**Phase**: 1 | **Branch**: `003-multi-tenant-api` | **Date**: 2026-05-30
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

---

## 1. PostgreSQL Schema — All Tables

All tables live in the `public` schema. All tenant-scoped tables carry a `tenant_id UUID NOT NULL` column with a composite index on `(tenant_id, id)`.

### 1.1 `users`

Platform-level accounts. Not tenant-scoped — email is globally unique.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | Generated: `gen_random_uuid()` |
| `email` | `TEXT UNIQUE NOT NULL` | Global uniqueness |
| `password_hash` | `TEXT NOT NULL` | bcrypt |
| `first_name` | `TEXT NOT NULL` | |
| `last_name` | `TEXT NOT NULL` | |
| `role` | `TEXT NOT NULL` | `'Admin' \| 'TenantUser'` |
| `permissions` | `TEXT[] DEFAULT '{}'` | Fine-grained permission strings |
| `is_active` | `BOOL DEFAULT true` | |
| `is_super_admin` | `BOOL DEFAULT false` | Bypasses all tenant checks |
| `last_login_at` | `TIMESTAMPTZ` | |
| `last_active_tenant_id` | `UUID` | FK → `tenants.id`, nullable |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `UNIQUE(email)`, `INDEX(last_active_tenant_id)`

---

### 1.2 `refresh_tokens`

Server-side refresh token store. Enables explicit revocation on logout.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `user_id` | `UUID NOT NULL FK → users.id` | |
| `tenant_id` | `UUID FK → tenants.id` | Nullable (Admin tokens have no tenant) |
| `token` | `TEXT NOT NULL UNIQUE` | Opaque UUID v4 |
| `expires_at` | `TIMESTAMPTZ NOT NULL` | `NOW() + 7 days` |
| `is_revoked` | `BOOL DEFAULT false` | Set to true on logout |
| `ip_address` | `TEXT` | For audit |
| `user_agent` | `TEXT` | For audit |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `INDEX(token)`, `INDEX(user_id)`, `INDEX(tenant_id)`

---

### 1.3 `user_tenants`

Join table: which tenants a user belongs to, and with what per-tenant role/permissions.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `user_id` | `UUID NOT NULL FK → users.id` | |
| `tenant_id` | `UUID NOT NULL FK → tenants.id` | |
| `role` | `TEXT NOT NULL DEFAULT 'TenantUser'` | `'Admin' \| 'TenantUser'` |
| `permissions` | `TEXT[] DEFAULT '{}'` | |
| `is_active` | `BOOL DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `UNIQUE(user_id, tenant_id)`, `INDEX(tenant_id)`

---

### 1.4 `tenants`

Platform-level tenant records. Not tenant-scoped (Admin-only writes).

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `name` | `TEXT UNIQUE NOT NULL` | Platform-unique |
| `contact_email` | `TEXT NOT NULL` | |
| `is_active` | `BOOL DEFAULT true` | Soft-delete flag |
| `deleted_at` | `TIMESTAMPTZ` | Non-null = soft-deleted |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `UNIQUE(name)`

---

### 1.5 `customers`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID NOT NULL FK → tenants.id` | |
| `first_name` | `TEXT NOT NULL` | |
| `last_name` | `TEXT NOT NULL` | |
| `email` | `TEXT NOT NULL` | Unique per tenant (see index) |
| `phone` | `TEXT` | |
| `is_active` | `BOOL DEFAULT true` | |
| `deleted_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `UNIQUE(tenant_id, email)`, `INDEX(tenant_id, id)`

**Invariants**:
- Email unique within tenant (not globally)
- Cannot be deleted if referenced by any Appointment (`deleted_at` only set when no live appointments)

---

### 1.6 `vehicles`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID NOT NULL FK → tenants.id` | |
| `customer_id` | `UUID NOT NULL FK → customers.id` | Must be same tenant |
| `license_plate` | `TEXT NOT NULL` | |
| `make` | `TEXT NOT NULL` | |
| `model` | `TEXT NOT NULL` | |
| `year` | `INT NOT NULL` | |
| `deleted_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `INDEX(tenant_id, customer_id)`, `INDEX(tenant_id, id)`

**Invariants**:
- `customer_id` must reference a Customer in the same tenant (enforced at application layer)
- Cannot be deleted if referenced by any active/future Appointment

---

### 1.7 `service_types`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID NOT NULL FK → tenants.id` | |
| `name` | `TEXT NOT NULL` | Unique per tenant |
| `estimated_duration_minutes` | `INT NOT NULL` | |
| `deleted_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `UNIQUE(tenant_id, name)`, `INDEX(tenant_id, id)`

---

### 1.8 `technicians`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID NOT NULL FK → tenants.id` | |
| `first_name` | `TEXT NOT NULL` | |
| `last_name` | `TEXT NOT NULL` | |
| `email` | `TEXT NOT NULL` | Unique per tenant |
| `is_active` | `BOOL DEFAULT true` | |
| `deleted_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `UNIQUE(tenant_id, email)`, `INDEX(tenant_id, id)`

---

### 1.9 `technician_skills`

Many-to-many join: Technician ↔ ServiceType (within same tenant).

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID NOT NULL FK → tenants.id` | Denormalized for isolation checks |
| `technician_id` | `UUID NOT NULL FK → technicians.id` | |
| `service_type_id` | `UUID NOT NULL FK → service_types.id` | |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `UNIQUE(tenant_id, technician_id, service_type_id)`, `INDEX(tenant_id, technician_id)`

**Invariants**:
- `technician_id` and `service_type_id` must both belong to the same `tenant_id`

---

### 1.10 `service_bays`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID NOT NULL FK → tenants.id` | |
| `name` | `TEXT NOT NULL` | Unique per tenant |
| `deleted_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `UNIQUE(tenant_id, name)`, `INDEX(tenant_id, id)`

---

### 1.11 `appointments`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID NOT NULL FK → tenants.id` | |
| `customer_id` | `UUID NOT NULL FK → customers.id` | |
| `vehicle_id` | `UUID NOT NULL FK → vehicles.id` | |
| `service_type_id` | `UUID NOT NULL FK → service_types.id` | |
| `technician_id` | `UUID NOT NULL FK → technicians.id` | |
| `service_bay_id` | `UUID NOT NULL FK → service_bays.id` | |
| `start_time` | `TIMESTAMPTZ NOT NULL` | Must be in future on create |
| `end_time` | `TIMESTAMPTZ NOT NULL` | Must be > `start_time` |
| `status` | `TEXT NOT NULL DEFAULT 'PENDING'` | `PENDING \| CONFIRMED \| COMPLETED \| CANCELLED` |
| `notes` | `TEXT` | |
| `deleted_at` | `TIMESTAMPTZ` | Soft-cancel |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Indexes**: `INDEX(tenant_id, id)`, `INDEX(tenant_id, technician_id, start_time, end_time)`, `INDEX(tenant_id, service_bay_id, start_time, end_time)`, `INDEX(tenant_id, status)`, `INDEX(tenant_id, start_time)`

**Invariants**:
- All FK references must share the same `tenant_id` (enforced at application layer)
- `end_time > start_time`
- `start_time` must be in the future on create
- Status transitions: `PENDING → CONFIRMED → COMPLETED`, `PENDING|CONFIRMED → CANCELLED`
- Technician and ServiceBay overlap detection: `A.start_time < B.end_time AND A.end_time > B.start_time`

---

## 2. Domain Entities (TypeScript — no ORM dependencies)

Location: `apps/appointment-api-service/src/domain/entities/`

Each domain entity is a plain TypeScript interface or class with no ORM decorators — keeping the domain layer clean.

```typescript
// Example: customer.entity.ts
export interface Customer {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Application Port Interfaces

Location: `apps/appointment-api-service/src/application/ports/repositories/`

Each repository port defines the operations the use cases depend on. Example:

```typescript
// customer.repository.port.ts
export interface ICustomerRepository {
  create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;              // always scoped to tenant
  findAll(opts?: { page: number; pageSize: number }): Promise<{ data: Customer[]; total: number }>;
  findByEmail(email: string): Promise<Customer | null>;        // always scoped to tenant
  update(id: string, data: Partial<Customer>): Promise<Customer>;
  softDelete(id: string): Promise<void>;
  hasActiveAppointments(id: string): Promise<boolean>;         // guards deletion
}
```

All methods that return data are implicitly scoped to the `tenant_id` stored in `AsyncLocalStorage` — the concrete Drizzle adapter reads from context, not from method parameters.

---

## 4. JWT Auth Context (enriched `AsyncLocalStorage`)

The existing `tenantContext` only stores `{ tenantId: string }`. After this plan, it stores the full auth context:

```typescript
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: 'Admin' | 'TenantUser';
  permissions: string[];
  isSuperAdmin: boolean;
}
```

This allows use cases and repository adapters to access role information without parameter drilling.

---

## 5. State Machines

### 5.1 Appointment Status

```
         ┌─────────────────────────────────┐
         ▼                                 │
     PENDING ──CONFIRM──► CONFIRMED ──COMPLETE──► COMPLETED
         │                    │
         └────CANCEL──┐  ─────┘
                      ▼
                  CANCELLED
```

Invalid transitions → `422 Unprocessable Entity` with message: `"Invalid status transition from X to Y"`

### 5.2 User Registration (pending tenant assignment)

```
Register (no tenantId) → user created, no tokens → Admin assigns UserTenant → user can login
Register (with tenantId) → user + UserTenant created, tokens issued immediately
```

---

## 6. Overlap Detection Query

Used in `CreateAppointmentCrudUseCase` (the direct-write path, distinct from the ingestion stream path):

```sql
-- Check Technician availability
SELECT id FROM appointments
WHERE tenant_id = :tenantId
  AND technician_id = :technicianId
  AND deleted_at IS NULL
  AND status NOT IN ('CANCELLED')
  AND start_time < :endTime
  AND end_time > :startTime
LIMIT 1;

-- Check ServiceBay availability
SELECT id FROM appointments
WHERE tenant_id = :tenantId
  AND service_bay_id = :serviceBayId
  AND deleted_at IS NULL
  AND status NOT IN ('CANCELLED')
  AND start_time < :endTime
  AND end_time > :startTime
LIMIT 1;
```

Returns conflicting appointment ID in `409 Conflict` response body.
