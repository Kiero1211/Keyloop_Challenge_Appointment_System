# Feature Specification: Appointment Reminder

**Feature Branch**: `012-appointment-reminder`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "I want to implement an appointment reminder feature - The worker service will have a task running once every day. The task will check the start time of every appointment. - If there is less than 2 day until the start time, trigger email sending flow based on the customer’s email (Note that we must only send 1 reminder mail for each appointment once) - Try to create a database view (has appointment and customer and vehicle data), the worker service only need to look up the view to see the appointment and customer to remind."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Daily Appointment Reminders (Priority: P1)

As a dealership or service center system, I want to automatically send a reminder email to customers 2 days before their scheduled appointment, so that customers don't forget their appointments and no-show rates are reduced.

**Why this priority**: Reminding customers of upcoming appointments is critical for reducing no-shows and maintaining service center utilization.

**Independent Test**: Can be fully tested by scheduling an appointment 2 days in the future, running the daily reminder task, and verifying that the customer receives an email and the system records the reminder as sent.

**Acceptance Scenarios**:

1. **Given** an appointment scheduled within the next 2 days that has not had a reminder sent, **When** the daily reminder worker task runs, **Then** an email is triggered for the customer and the appointment is marked as having received a reminder.
2. **Given** an appointment scheduled within the next 2 days that already had a reminder sent, **When** the daily reminder worker task runs, **Then** no duplicate email is sent.
3. **Given** an appointment scheduled more than 2 days in the future, **When** the daily reminder worker task runs, **Then** no email is sent for that appointment.

### Edge Cases

- What happens when a customer has no email address on file?
- How does the system handle appointments that are created/booked less than 2 days before their start time? (Does it send a reminder immediately or skip?)
- What happens if the email sending service is temporarily down during the daily task execution?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST run a scheduled worker task once every day.
- **FR-002**: The system MUST identify all upcoming appointments starting in less than 2 days (48 hours).
- **FR-003**: The system MUST trigger an email to the customer associated with the appointment if they meet the time criteria.
- **FR-004**: The system MUST guarantee that only one reminder email is sent per appointment.
- **FR-005**: The system MUST use a database view that consolidates appointment, customer, and vehicle data to optimize the worker service's query for upcoming reminders.

### Key Entities

- **Appointment**: Represents a scheduled service visit. Contains start time and status.
- **Customer**: The person who owns the vehicle and booked the appointment. Contains contact information (email).
- **Vehicle**: The car being serviced.
- **Reminder Record / Status**: Tracks whether a reminder has been sent for a specific appointment to prevent duplicates.
- **AppointmentReminderView**: A consolidated view of appointment, customer, and vehicle data designed for fast querying by the worker service.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The worker task runs successfully every 24 hours without manual intervention.
- **SC-002**: 100% of customers with valid email addresses receive exactly one reminder email approximately 48 hours before their appointment.
- **SC-003**: No duplicate reminder emails are sent for the same appointment.
- **SC-004**: The daily worker task completes querying the database view and queuing emails within reasonable time limits even with thousands of daily appointments.

## Assumptions

- We assume that the email sending infrastructure (e.g., SMTP or third-party email provider) is already in place and can be triggered by the worker service.
- We assume that "less than 2 days" means any time under 48 hours from the scheduled start time, and the daily cron will naturally catch it.
- We assume there is a mechanism to record or track that a reminder has been sent, either by adding a flag to the appointment or a separate tracking table.
