# Quickstart

To test the auto-assignment feature locally:

1. Start the system via Docker Compose:
   ```bash
   docker compose up -d
   ```

2. Seed the database with at least one technician (with specific skills) and one service bay if not already present.

3. **Test Auto-Assignment (Success)**:
   - Send a POST request to `/api/v1/appointments` with `autoAssigned: true` and a `serviceTypeId` that matches the skills of your technician.
   - Omit the `technicianId` and `serviceBayId` fields.
   - Verify in the database (or via API) that the appointment was created and populated with the correct technician and bay IDs.

4. **Test DLQ Routing (Failure)**:
   - Send another POST request to `/api/v1/appointments` with `autoAssigned: true`, but use a `serviceTypeId` that no technician possesses.
   - Verify that the appointment is not created in the main appointments table, and instead a message is routed to the DLQ.

5. **Test Manual Assignment**:
   - Send a POST request with `autoAssigned: false` and omit the resource IDs. The API should reject this with a validation error (HTTP 400).
   - Resend with the resource IDs populated. The API should accept it.
