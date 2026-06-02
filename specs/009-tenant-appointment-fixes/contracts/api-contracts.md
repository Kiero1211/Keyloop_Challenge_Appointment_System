# API Contracts: Tenant Appointment Fixes

## 1. Get Available Technicians
**Endpoint**: `GET /api/technicians/available`
**Query Parameters**:
- `startTime` (string, ISO8601): The start of the time frame.
- `endTime` (string, ISO8601): The end of the time frame.
**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe"
  }
]
```

## 2. Get Available Service Bays
**Endpoint**: `GET /api/service-bays/available`
**Query Parameters**:
- `startTime` (string, ISO8601): The start of the time frame.
- `endTime` (string, ISO8601): The end of the time frame.
**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Bay 1"
  }
]
```

## 3. Update to GET Appointments
**Endpoint**: `GET /api/appointments`
**Query Parameters** (Updated):
- `startTime` (string, ISO8601, optional): If provided, filters appointments starting after this time.
- `endTime` (string, ISO8601, optional): If provided, filters appointments ending before this time.
*Note: Removes the previous restriction that it only works for the same day.*

## 4. Role Assignment Endpoints
**Endpoint**: `POST /api/tenants/:id/users`
**Request Body**:
```json
{
  "userId": "uuid",
  "role": "TenantUser" // Or TenantManager
}
```
**Authorization**: 
- Admin can assign any role. 
- TenantManager can assign `TenantUser` to a Guest.

**Endpoint**: `PUT /api/tenants/:id/users/:userId/role`
**Request Body**:
```json
{
  "role": "TenantManager"
}
```
**Authorization**: Admin only.
