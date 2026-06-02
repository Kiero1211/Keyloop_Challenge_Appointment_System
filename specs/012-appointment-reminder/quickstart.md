# Quickstart: Appointment Reminder Testing

To verify the appointment reminder feature locally:

1. **Start dependencies**:
   ```bash
   docker compose up -d postgres
   ```

2. **Run migrations**:
   The worker service will automatically apply migrations on startup (or run via EF Core tools):
   ```bash
   cd apps/appointment-worker-service
   dotnet ef database update
   ```

3. **Start the worker service**:
   ```bash
   dotnet run
   ```

4. **Testing the daily task**:
   - The worker runs periodically (e.g., every 1 hour).
   - Create a test appointment for a tenant in the database starting in < 48 hours.
   - You can temporarily change the timer delay in `DailyReminderBackgroundService.cs` to e.g., 10 seconds for testing.
   - Observe the console output showing "Email sent to customer@email.com" (if email sending is mocked in development) and a new record appearing in the `AppointmentReminders` table.
