export type EntityType = 'Technicians' | 'ServiceBays' | 'Appointments' | 'AuditLogs' | 'Tenants' | 'Users' | 'Vehicles' | 'ServiceTypes' | 'RoleManagement';

export interface AuthSession {
  token: string | null;
  tenant_id: string | null;
  role: string | null;
  isSuperAdmin: boolean;
  status: 'logged_out' | 'logged_in';
}

export interface ViewContext {
  currentEntity: EntityType;
}
