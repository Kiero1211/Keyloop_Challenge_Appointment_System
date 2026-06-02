# Feature Specification: API Client UI

**Feature Branch**: `[013-api-client-ui]`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Create a simple UI to interact with the api service (Display all rows in the column, allow login and switch tenant). The UI should be very simple to show data only (minimal css needed) Everything should be in one page only. The UI can be written in a simple React.js project. Try to share the schemas with the api service"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authentication and Tenant Selection (Priority: P1)

As a user, I need to log into the application and select a tenant context so that I can interact with the API securely and view the correct tenant's data.

**Why this priority**: Without authentication and tenant context, no API requests can be authorized or correctly routed.

**Independent Test**: Can be fully tested by verifying that the user receives an auth token upon login and can toggle between available tenants.

**Acceptance Scenarios**:

1. **Given** the user is unauthenticated, **When** they enter valid credentials, **Then** they are logged in and see the tenant selection option.
2. **Given** the user is logged in, **When** they switch the tenant, **Then** all subsequent data fetches use the newly selected tenant context.

---

### User Story 2 - Data Visualization (Priority: P2)

As a user, I need to view the API data in a single page view so that I can easily verify the rows returned by the API service.

**Why this priority**: This fulfills the primary requirement of displaying the "rows" from the API service in a simple format.

**Independent Test**: Can be fully tested by ensuring the data table populates correctly when connected to the API service.

**Acceptance Scenarios**:

1. **Given** a selected tenant context, **When** the data is fetched, **Then** it is displayed in a simple tabular format on the same page.
2. **Given** a data fetch error, **When** the API returns an error, **Then** a simple error message is displayed to the user.

### Edge Cases

- What happens when the login credentials are invalid?
- How does the system handle an API endpoint being unreachable?
- What happens if the selected tenant has no data to display?
- How does the UI handle token expiration?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to authenticate using credentials.
- **FR-002**: System MUST allow authenticated users to switch their active tenant.
- **FR-003**: System MUST fetch and display data rows from the API in a simple tabular format on a single page.
- **FR-004**: System MUST share schemas with the backend API service to ensure data consistency.
- **FR-005**: System MUST provide minimal CSS styling to focus purely on data presentation.
- **FR-006**: System MUST fetch and display data for all major entities: Technicians, ServiceBays, Appointments, and AuditLogs.
- **FR-007**: System MUST handle permission errors (e.g., HTTP 403) gracefully by displaying a "You don't have permission to see this" message instead of crashing or showing technical errors.

### Key Entities

- **Auth Session**: Represents the logged-in user and their current authentication token.
- **Tenant**: Represents the organizational context currently selected.
- **Data Row**: Represents a generic item fetched from the shared API schemas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The UI successfully authenticates and retrieves a token within 2 seconds.
- **SC-002**: A user can switch the active tenant and see the updated data load within 3 seconds.
- **SC-003**: The UI codebase reuses 100% of the necessary data schemas from the existing API service without duplication.
- **SC-004**: The entire application is contained within a single page without client-side routing between views.

## Assumptions

- The API service provides endpoints for authentication and tenant information.
- The shared schemas are accessible in a format that the frontend client can easily consume.
- Data displayed is read-only in this simple UI unless otherwise specified.
- The application will be a standard Single Page Application (SPA).
