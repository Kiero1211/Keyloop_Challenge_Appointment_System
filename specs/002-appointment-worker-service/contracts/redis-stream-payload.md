# Appointment Stream Payload Contract

This defines the structure of messages expected on the Redis Stream partitions (e.g., `appointment:stream:0`).

## Message Structure
Messages should be published as Redis Stream entries with the following fields (flat key-value pairs).

| Field | Type | Description |
|-------|------|-------------|
| `TenantId` | string | The isolated dealership tenant ID. Required. |
| `VehicleId` | string | The vehicle requiring service. Required. |
| `CustomerId` | string | The customer booking the service. Required. |
| `ServiceTypeId` | string | The ID of the requested service. Required. |
| `DesiredStartTime` | ISO 8601 string | The requested start time. Required. |
| `Source` | string | Origin of the booking (e.g., "api", "web"). Optional. |
