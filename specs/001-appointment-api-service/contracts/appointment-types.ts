/**
 * Redis Stream message payload contract — published to appointments_stream_{0..3}
 * Consumed by: appointment-worker-service
 * Source: packages/shared-types/src/appointment-command.ts
 *
 * This is the TypeScript interface definition. The worker service mirrors this
 * as a C# record; both must stay in sync manually until a code-gen pipeline
 * is introduced.
 */

/**
 * The compiled command published to a Redis Stream partition by the API service.
 * Fields not yet resolved at intake time are omitted (undefined/absent), not null.
 */
export interface AppointmentStreamMessage {
  /** UUID v4 — unique per enqueue, used for idempotency tracking in the worker */
  commandId: string;

  /** Tenant (dealership) identifier — mandatory multi-tenant discriminator */
  tenantId: string;

  /** Customer identifier — sourced from customer-service */
  customerId: string;

  /** Vehicle identifier — used as partition routing key input */
  vehicleId: string;

  /** Service catalogue item identifier */
  serviceTypeId: string;

  /** Requested appointment start time — ISO 8601 UTC, strictly future at intake */
  desiredStartTime: string;

  /** Redis Stream partition this message was routed to — integer 0–3 */
  partitionId: number;

  /**
   * Origin of the booking request.
   * "admin" = authenticated staff via this endpoint.
   * "public" = unauthenticated customer (future endpoint, out of scope for v1).
   */
  source: "admin" | "public";

  /** Server-side intake timestamp — ISO 8601 UTC */
  timestamp: string;
}

/**
 * The appointment hash record stored in Redis Cache at intake time.
 * Key: tenant:{tenantId}:appointment:{vehicleId}
 *
 * Fields unknown at intake (technicianId, bayId, workshopId) are absent.
 * The worker service updates these fields via HSET when they become known.
 * The worker deletes the entire key when the booking reaches a terminal state.
 */
export interface AppointmentHashRecord {
  commandId: string;
  tenantId: string;
  customerId: string;
  vehicleId: string;
  serviceTypeId: string;
  desiredStartTime: string;
  source: "admin" | "public";
  timestamp: string;
  partitionId: string; // stored as string in Redis HSET; parse to number on read

  // Absent at intake; populated by worker:
  technicianId?: string;
  bayId?: string;
  workshopId?: string;
}

/** Cache key builder — must match multi_tenancy rule §2 pattern */
export function buildAppointmentHashKey(tenantId: string, vehicleId: string): string {
  return `tenant:${tenantId}:appointment:${vehicleId}`;
}

/** Stream name builder */
export function buildStreamName(partitionId: number): string {
  return `appointments_stream_${partitionId}`;
}
