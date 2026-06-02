# Data Model: Appointment Reminder

## Database Entities

### 1. `AppointmentReminder` (New Table)
A tracking table to record that a reminder has been successfully sent for an appointment. This avoids modifying the core `Appointments` table schema directly and keeps reminder logic segregated.

**Fields**:
- `Id` (Guid, Primary Key)
- `TenantId` (String, Required) - For multi-tenancy isolation.
- `AppointmentId` (Guid, Required, Foreign Key to Appointments) - The appointment being reminded.
- `SentAt` (DateTimeOffset, Required) - When the reminder was sent.

**Constraints & Indexes**:
- Unique constraint on `(TenantId, AppointmentId)` to ensure strictly one reminder per appointment.

---

## Database Views

### 1. `AppointmentReminderView` (New View)
A consolidated read-only view optimizing the worker's query to find appointments needing reminders.

**Source Tables**:
- `Appointments` (A)
- `Customers` (C)
- `Vehicles` (V)
- `AppointmentReminders` (AR) - LEFT JOIN to filter out already sent reminders.

**Exposed Fields**:
- `TenantId` (String)
- `AppointmentId` (Guid) - From `A.Id`
- `AppointmentStartTime` (DateTimeOffset) - From `A.StartTime`
- `AppointmentStatus` (String) - From `A.Status` (to filter out cancelled/completed)
- `CustomerId` (Guid) - From `C.Id`
- `CustomerEmail` (String) - From `C.Email`
- `CustomerName` (String) - From `C.FirstName` / `C.LastName`
- `VehicleId` (Guid) - From `V.Id`
- `VehicleMake` (String) - From `V.Make`
- `VehicleModel` (String) - From `V.Model`
- `ReminderSent` (Boolean) - `TRUE` if `AR.AppointmentId` is not null.

**View Logic**:
```sql
SELECT
    A.TenantId,
    A.Id AS AppointmentId,
    A.StartTime AS AppointmentStartTime,
    A.Status AS AppointmentStatus,
    C.Id AS CustomerId,
    C.Email AS CustomerEmail,
    C.FirstName || ' ' || C.LastName AS CustomerName,
    V.Id AS VehicleId,
    V.Make AS VehicleMake,
    V.Model AS VehicleModel,
    CASE WHEN AR.Id IS NOT NULL THEN TRUE ELSE FALSE END AS ReminderSent
FROM Appointments A
JOIN Customers C ON A.CustomerId = C.Id AND A.TenantId = C.TenantId
JOIN Vehicles V ON A.VehicleId = V.Id AND A.TenantId = V.TenantId
LEFT JOIN AppointmentReminders AR ON A.Id = AR.AppointmentId AND A.TenantId = AR.TenantId
WHERE A.Status = 'Scheduled'
```

---

## Domain Entities

### `AppointmentReminderData` (Read-Only Entity)
Maps directly to the `AppointmentReminderView`.

**Properties**:
- `TenantId` (string)
- `AppointmentId` (Guid)
- `AppointmentStartTime` (DateTimeOffset)
- `CustomerEmail` (string)
- `CustomerName` (string)
- `VehicleMake` (string)
- `VehicleModel` (string)
- `ReminderSent` (bool)
