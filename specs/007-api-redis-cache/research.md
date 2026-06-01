# Research: API Redis Read-Through Cache

## Decisions

### 1. Redis Client and Data Structure
- **Decision**: Use `ioredis` in `appointment-api-service` and `StackExchange.Redis` in `appointment-worker-service`. Use Redis Hashes (`HSET`, `HGETALL`) to store entities. Since we're using TypeScript and C#, we'll store entities as Hash fields or a single JSON string field within the hash. Actually, storing as a flat Hash of fields is fine, or standard `SET` with JSON. The spec explicitly says "Use Redis Hash data structure", so we will use `HSET`.
- **Rationale**: The specification mandates Redis Hash.
- **Alternatives considered**: Redis `SET` with stringified JSON (rejected: spec strictly requires Hash).

### 2. Unified Appointment Status
- **Decision**: Unify statuses to `'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled'`.
- **Rationale**: Simplifies the domain model and enables explicit TTL caching rules.
- **Alternatives considered**: Adding a mapped state layer (rejected due to added complexity).

### 3. Cache Population and Invalidation
- **Decision**: 
  - **Read**: API service checks Redis. On miss, it fetches from PostgreSQL, stores in Redis (with TTL if applicable), and returns.
  - **Update/Delete**: When an entity is updated or deleted synchronously via API endpoints, the cache is updated/deleted.
  - **Async Worker**: For appointments processed asynchronously by the C# worker, the worker must also update the Redis cache upon successful PostgreSQL transaction commit to ensure immediate read consistency, applying the correct TTL rules.
- **Rationale**: Maintains strong read-after-write consistency for the end user while obeying the architectural rule that the worker owns complex logic.
- **Alternatives considered**: Event-driven cache invalidation (rejected: too complex for this feature size).
