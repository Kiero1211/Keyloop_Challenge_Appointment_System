# Phase 0: Outline & Research

## Concurrency Control for Auto-Assignment
- **Decision**: Implement a distributed lock (e.g., using Redis) during the resource checking and assignment phase in the worker service.
- **Rationale**: Multiple workers might attempt to assign the same last available technician or bay concurrently. A distributed lock over the scheduling timeslot for a specific bay/technician ensures that only one worker can claim it. If a collision occurs, the other worker can simply retry the search for the next available resource.
- **Alternatives considered**: Optimistic concurrency control via EF Core. This could work for simple row updates, but checking multiple tables (bays, technicians, schedules) and ensuring atomicity is better handled by a coarse-grained distributed lock during the allocation window, or by using a serializable transaction if the database supports it without heavy contention.

## Handling Unfulfillable Skill Requirements
- **Decision**: Route appointments with impossible skill requirements directly to the Dead Letter Queue (DLQ).
- **Rationale**: If a `serviceTypeId` demands a skill no technician in the current shop possesses, it cannot be fulfilled by simply waiting. Routing to DLQ allows human intervention without blocking the main processing queues.
- **Alternatives considered**: Rejecting the API request early. This was rejected because skill matrices might be dynamic, and the API service strictly avoids querying database state (like technician skills) per Constitution Principle I.

## Handling DLQ Processing Delays
- **Decision**: Out of scope for this feature.
- **Rationale**: The DLQ operational procedures and monitoring are handled system-wide and are not part of the core auto-assign logic.
- **Alternatives considered**: None required.
