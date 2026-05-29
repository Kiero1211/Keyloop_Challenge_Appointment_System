---
name: multi_tenancy
activation: Always On
description: Ensure strict logical multi-tenant partitioning using tenant_id across all layers.
---

# Multi-Tenancy & Data Isolation Guidelines

The system is a highly secure, multi-tenant SaaS application where each dealership is partitioned logically by a `tenant_id`. Data leakage between tenants is a critical security failure.

## 1. Request & Payload Isolation
* **Mandatory Validation**: Every API intake and messaging payload must explicitly require a valid, non-empty `tenant_id`. Reject requests immediately at the HTTP or consumer boundary if it is missing or malformed.
* **Context Propagation**: Pass `tenant_id` context downstream explicitly or via a scoped execution context (e.g., AsyncLocal in C# or AsyncLocalStorage in Node.js) to avoid manual parameter-drilling errors.

## 2. Cache Key Partitioning
* **Prefixing**: All cache keys must include a tenant prefix to prevent key collisions and data leakage.
* **Pattern**: `tenant:{tenant_id}:{resource_type}:{resource_id}` (e.g., `tenant:dealership123:appointment:hash_abc`)

## 3. Message Queue/Stream Partitioning
* **Metadata Enrichment**: Enqueued messages in the Redis Stream (or Kafka) must include the `tenant_id` in the message headers/metadata.
* **Consistent Partitioning**: Use `tenant_id` (or a combination of `tenant_id` and resource key) as the routing key for consistent hashing to ensure sequential execution of resource-specific operations within partitions.

## 4. Database Isolation
* **Global Query Filters**: Apply a tenant-aware DbContext or Global Query Filter in EF Core to automatically filter queries by the active tenant ID.
* **Compounded Indexing**: Every table must have a `tenant_id` column. Ensure this column is indexed alongside primary keys (e.g., composite index on `(tenant_id, id)`) to optimize query plans and prevent costly cross-tenant table scans.
