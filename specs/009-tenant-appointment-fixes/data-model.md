# Data Model: Tenant Appointment Fixes

## 1. User and Roles

### `users` (Table)
- **Fields**: `id`, `email`, `role` (Admin/User), `lastActiveTenantId`
- **Transitions**: 
  - A user with no mapping in `user_tenants` is functionally a **Guest**.
  - Can be mapped to multiple tenants via `user_tenants`.

### `user_tenants` (Table)
- **Fields**: `userId`, `tenantId`, `role`
- **Role Validation**: Role must be either `TenantUser` or `TenantManager`.
- **Transitions**:
  - Guest -> TenantUser (Assigned by TenantManager).
  - TenantUser -> TenantManager (Promoted by Admin).

## 2. Appointment

### `appointments` (Table)
- **Fields**: `id`, `tenantId`, `scheduledStartTime`, `scheduledEndTime`, `status`, `technicianId`, `serviceBayId`
- **Validation Rules**:
  - `scheduledEndTime` MUST equal `scheduledStartTime` + `ServiceType.estimatedDurationMinutes`.
  - Cannot overlap with existing appointments for the same `technicianId` or `serviceBayId` within the `tenantId`.

## 3. Availability Query (Read Model)
- **Fields**: `startTime`, `endTime`
- **Logic**: Find all `Technicians` (or `ServiceBays`) where `id` NOT IN (SELECT `technicianId` FROM `appointments` WHERE `scheduledStartTime` < `endTime` AND `scheduledEndTime` > `startTime`).

## 4. Redis Streams
- **Stream Key Format**: `tenant:{tenant_id}:appointments_stream_{partition}`
- **Payload**: Full appointment creation intent.
