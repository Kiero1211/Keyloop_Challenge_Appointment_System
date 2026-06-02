# Quickstart: Testing the Redis Cache

1. **Boot the environment**:
   ```bash
   docker compose up -d
   ```

2. **Verify cache on read**:
   Fetch an entity (e.g. an appointment) via the API.
   The first request will hit PostgreSQL and store it in Redis.
   Subsequent requests will be served from Redis.
   You can verify this by checking the Redis logs or using `redis-cli`:
   ```bash
   docker compose exec redis redis-cli HGETALL "tenant:<tenant_id>:appointment:<id>"
   ```

3. **Verify cache invalidation/update**:
   Update the entity via the API or trigger the worker. Check Redis again to see the updated fields.
   
4. **Verify TTL**:
   Update an appointment status to 'Completed'.
   ```bash
   docker compose exec redis redis-cli TTL "tenant:<tenant_id>:appointment:<id>"
   ```
   It should return a number close to `21600`.
