# Research & Decisions

## Context
Implementing a 5-minute temporary slot hold in `appointment-api-service` (Node.js/Redis) to prevent concurrent double bookings, and dropping the vehicle idempotency check.

## Findings & Decisions

### 1. Temporary Hold Storage
- **Decision**: Use Redis with `SET EX` command.
- **Rationale**: Redis provides automatic expiration natively, which is perfect for a 5-minute hold. It runs atomically.
- **Alternatives considered**: Storing holds in PostgreSQL (requires polling or background jobs for cleanup).

### 2. Concurrency Prevention
- **Decision**: Use `SETNX` (Set if Not Exists) with an expiry, or the equivalent `SET key value NX EX 300`.
- **Rationale**: This guarantees that if two users try to hold the exact same technician + service bay at the exact same millisecond, only one will succeed.

### 3. Hold Keys
- **Decision**: Create two separate lock keys per hold request:
  - `tenant:{tenant_id}:hold:technician:{tech_id}`
  - `tenant:{tenant_id}:hold:bay:{bay_id}`
- **Rationale**: Since a technician and a service bay are distinct entities, holding them with a composite key (`tech:X:bay:Y`) would fail to prevent another user from booking the same technician `X` with a different bay `Z`. Two separate locks guarantee that neither resource can be booked by others. Both keys should have the same expiration and share the same `holdId` value.

### 4. Vehicle Idempotency
- **Decision**: Remove the check `exists = await this.cacheProvider.get('tenant:XYZ:appointment:vin-ABC')` inside `CreateAppointmentUseCase` in the API.
- **Rationale**: Fulfills the explicit user request (FR-006).

All clarifications are resolved.
