# Quickstart: API Caching and Small Fixes

This feature introduces caching for list endpoints, failed appointment tracking, and automatic database initialization.

## Caching
When a GET request for a list of general entities (like Technicians, Customers, etc.) is made, the API will now automatically check a Redis cache (utilizing Sets for keys and Hashes for individual objects). 
If the cache is populated, no database query will be executed. 

## Failed Appointments
Appointments that fail processing (e.g. due to concurrency conflicts or auto-assignment failures) will now be marked as `Failed` in the database. You can query these by filtering appointments by the `Failed` status.

## Database Initialization
On startup, the API service will automatically run `seed/tables.sql` and `seed/seed.sql` to ensure the database schema exists and default seed data is available without manual setup.
