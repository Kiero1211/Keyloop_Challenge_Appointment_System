# Research: appointment-worker-service

## Topic: Concurrency Control Strategy

**Decision**: Use PostgreSQL/EF Core Optimistic Concurrency Control (OCC) using the implicit `xmin` system column (or explicit `uint` Version token).

**Rationale**: 
The specification demands zero double-bookings for the same physical `ServiceBay` and `Technician`. While a distributed lock via Redis (RedLock) could work, it adds operational complexity and potential deadlock scenarios if a worker crashes while holding the lock. PostgreSQL provides ACID guarantees and native row-level versioning. By using EF Core's built-in support for concurrency tokens, the `AppointmentProcessor` can attempt to save the `TrackingRecord` (or an allocation record for the Bay/Technician at that timeslot) and rely on a `DbUpdateConcurrencyException` to detect and safely reject concurrent double-booking attempts.

**Alternatives considered**: 
- *Redis Distributed Lock*: Rejected due to added complexity when a robust relational database is already part of the worker's stack.
- *Pessimistic Locking (SELECT FOR UPDATE)*: Rejected because it holds database connections open during the HTTP call to `bay-service`, reducing throughput.

## Topic: Temporary Unavailability of bay-service (DLQ Strategy)

**Decision**: Implement a Dead-Letter Queue (DLQ) in Redis Streams.

**Rationale**:
When the `BayService` is unreachable, we cannot determine if the appointment is valid. As specified in the clarification, the system must route failed requests to a DLQ for manual inspection or later replay. When an HTTP timeout occurs, the worker will acknowledge the message from the main stream but publish a clone of it to a DLQ stream (e.g., `appointment:dlq`).

**Alternatives considered**:
- *Exponential Backoff/Retry*: Explicitly rejected by user clarification.
- *Immediate Failure/Drop*: Explicitly rejected by user clarification.
