# Research: Appointment Reminder

## Scheduling Background Tasks in .NET 8 Worker Service

**Decision**: We will use a standard `BackgroundService` with a simple `Task.Delay(TimeSpan.FromHours(24))` to run the check once every day.

**Rationale**: The requirement is simply to run a task once a day. Using a basic `while` loop with `Task.Delay` for 24 hours is the most direct and lightweight approach, avoiding any complex third-party scheduling libraries.

**Alternatives considered**: 
- **Quartz.NET / Hangfire**: Overkill for a single daily task; introduces additional schema and dependencies.

## Creating and Mapping Database Views in EF Core

**Decision**: We will use EF Core's `.ToView("AppointmentReminderView")` mapping. We will create an empty migration using `dotnet ef migrations add CreateAppointmentReminderView` and manually write the `Up` (CREATE VIEW) and `Down` (DROP VIEW) SQL statements. We will create a read-only entity `AppointmentReminderData` in the Domain/Application layer that maps to this view.

**Rationale**: EF Core natively supports querying views by mapping them as keyless entity types or standard entities (if we define a key). The view will JOIN `Appointments`, `Customers`, and `Vehicles` and filter appropriately, providing a pre-optimized flat structure for the background service to process.

**Alternatives considered**:
- **Raw SQL via Dapper**: Not necessary if EF Core can map it directly to an entity, maintaining consistency with our EF Core usage.
- **LINQ Joins in the application code**: The spec explicitly requires creating a database view, and a view provides encapsulation and potential indexing/optimization at the database level.

## Tracking Sent Reminders

**Decision**: We will add a `ReminderSentAt` timestamp (nullable) or a boolean flag `ReminderSent` to the `Appointments` table, or a separate `AppointmentReminders` table. Given the need for simplicity, adding a `ReminderSentAt` (DateTimeOffset?) to the `Appointment` entity is the most direct approach. Alternatively, if we don't want to modify the `Appointment` entity, a separate `AppointmentReminder` entity (Id, AppointmentId, SentAt) can be created. We will add a `ReminderSent` boolean or `ReminderSentAt` timestamp to the `Appointment` entity.

**Rationale**: Tracking it directly on the `Appointment` is straightforward and avoids a separate table join. When the worker processes an appointment, it updates this field.

**Alternatives considered**:
- **Separate `AppointmentReminder` table**: Keeps the `Appointment` table clean but requires a join. We'll stick to a simple field on `Appointment` if possible, or a separate table if the `Appointment` aggregate root is too complex to modify for this. We will use a separate table `AppointmentReminders` to strictly separate the reminder domain from the core appointment domain.

## Multi-Tenancy in Background Tasks

**Decision**: The background worker will query the view for all tenants (or iterate through tenants if there are many). Since `tenant_id` is part of every table, the view will expose `tenant_id`. When processing, the worker must explicitly wrap its operations in the `AsyncLocal<T>` tenant context (or equivalent) so that the EF Core Global Query Filter and downstream domain logic behave correctly, or it will explicitly supply `tenant_id` to the repository methods.

**Rationale**: Multi-tenancy must be strictly enforced. The background task acts as a system process but must act *on behalf* of a tenant when dispatching emails or saving status.
