export function appointmentHashKey(tenantId: string, appointmentId: string): string {
  return `tenant:${tenantId}:appointment:${appointmentId}`;
}

export function activeAppointmentsSetKey(tenantId: string): string {
  return `tenant:${tenantId}:appointments:active`;
}

export function technicianOccupiedKey(tenantId: string, technicianId: string): string {
  return `tenant:${tenantId}:technician:${technicianId}:occupied`;
}

export function bayOccupiedKey(tenantId: string, bayId: string): string {
  return `tenant:${tenantId}:bay:${bayId}:occupied`;
}

export function occupiedSlotHashKey(tenantId: string, appointmentId: string): string {
  return `tenant:${tenantId}:occupied_slot:${appointmentId}`;
}
