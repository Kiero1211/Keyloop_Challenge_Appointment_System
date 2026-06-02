# Data Model: API Client UI

The UI does not define its own backend data persistence schemas. Instead, it relies on and imports the domain entities defined in the `appointment-api-service`.

## Imported Entities

- **Tenant**: `{ id, name, api_key }`
- **Technician**: `{ id, name, email, phone, tenant_id }`
- **ServiceBay**: `{ id, name, tenant_id }`
- **Appointment**: `{ id, customer_id, vehicle_id, tenant_id, desired_time, status, ... }`
- **AuditLog**: `{ id, tenant_id, action, entity_type, entity_id, ... }`

## Local UI State Models

- **AuthSession**:
  - `token`: string (JWT)
  - `tenant_id`: string (currently selected tenant context)
  - `status`: 'logged_out' | 'logged_in'

- **ViewContext**:
  - `currentEntity`: 'Technicians' | 'ServiceBays' | 'Appointments' | 'AuditLogs'
