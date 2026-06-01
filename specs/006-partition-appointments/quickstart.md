# Quickstart: Appointment Table Partitioning

## Overview
This feature introduces PostgreSQL hash partitioning for the `appointments` table to scale data storage and indexing efficiently across multiple tenants. The changes are strictly confined to the database layer (specifically the `tables.sql` and `seed.sql` initialization scripts).

## How to Test

1. Rebuild or restart the local database container to run the updated `tables.sql` and `seed.sql` scripts (once implemented).
2. Validate that the partitions exist:
   ```sql
   SELECT inhrelid::regclass AS partition_name
   FROM pg_inherits
   WHERE inhparent = 'appointments'::regclass;
   ```
   *You should see 64 tables named `appointments_p000` through `appointments_p063`.*

3. Validate the primary key constraint:
   ```sql
   \d appointments
   ```
   *The primary key should be listed as `(tenant_id, id)`.*

4. Insert a test appointment and verify routing:
   ```sql
   -- Insert a dummy appointment with a known tenant_id
   -- Check which partition holds the data by running:
   SELECT tableoid::regclass, * FROM appointments WHERE tenant_id = 'YOUR-TENANT-UUID';
   ```
   *The `tableoid` column will show the name of the child partition where the data was physically stored.*
