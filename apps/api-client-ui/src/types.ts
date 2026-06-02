export type EntityType = 'Technicians' | 'ServiceBays' | 'Appointments' | 'AuditLogs' | 'Tenants';

export interface AuthSession {
  token: string | null;
  tenant_id: string | null;
  status: 'logged_out' | 'logged_in';
}

export interface ViewContext {
  currentEntity: EntityType;
}
