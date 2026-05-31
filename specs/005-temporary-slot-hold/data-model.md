# Data Model: Temporary Slot Hold

## Entities

### `TemporaryHold`
Represents a time-bound reservation of a technician and service bay to prevent concurrency issues during booking.

**Scope**: Node.js API Service (Domain Layer) / Redis (Infrastructure Layer)

**Attributes**:
- `holdId` (String) - Unique identifier for the hold (e.g. UUID).
- `tenantId` (String) - Dealership tenant ID.
- `technicianId` (String) - UUID of the held technician.
- `serviceBayId` (String) - UUID of the held service bay.
- `expiresAt` (Date) - Exact UTC timestamp when the hold will organically expire.

**State Transitions**:
- **Initiated**: 
  - `SET tenant:{tenantId}:hold:technician:{techId} {holdId} NX EX 300`
  - `SET tenant:{tenantId}:hold:bay:{bayId} {holdId} NX EX 300`
  - *(If either fails, the hold is rejected and the successful one is rolled back)*
- **Confirmed**: Hold is checked, message is pushed to Stream, and then `DEL` is called on both hold keys.
- **Expired**: Redis natively drops the keys after 300 seconds.

**Validation Rules**:
- A hold can only be initiated if the key does not already exist.
- A booking confirmation MUST provide the `holdId` to prove ownership of the hold, or the confirmation must otherwise match the hold key. Given the spec says "If they fail to confirm the booking after 5 minutes", we will just validate that the hold exists for the technician and bay. If multiple users are making appointments, they might provide a `holdId`.

*(Note: We will implement the cache payload as `{ holdId: string, expiresAt: string }` and store it at the cache key.)*
