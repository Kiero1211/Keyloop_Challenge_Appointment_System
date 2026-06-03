// Base URL for the API service
export const API_BASE_URL = 'http://localhost:3000'; // Adjust as per your environment

/**
 * Generic API fetch wrapper that automatically attaches the Authorization header
 * and the x-tenant-id header.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenant_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // If we receive a 401 or 403, we can handle it specifically or throw an error
    throw new Error(`HTTP error! status: ${response.status}`, { cause: response.status });
  }

  return response.json();
}

export async function getTenants(page = 1) {
  return apiFetch(`/api/v1/auth/tenants?page=${page}`);
}

export async function getAllTenants(page = 1) {
  return apiFetch(`/api/v1/tenants?page=${page}`);
}

export async function getTechnicians(page = 1) {
  return apiFetch(`/api/v1/technicians?page=${page}`);
}

export async function getServiceBays(page = 1) {
  return apiFetch(`/api/v1/service-bays?page=${page}`);
}

type ScopeParams = {
  page?: number;
  scope?: 'tenant' | 'mine';
  userId?: string;
};

function buildScopedQuery(params: ScopeParams = {}) {
  const query = new URLSearchParams();
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.scope) {
    query.set('scope', params.scope);
  }
  if (params.userId) {
    query.set('userId', params.userId);
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export async function getAppointments(params: ScopeParams | number = 1) {
  const normalized = typeof params === 'number' ? { page: params } : params;
  return apiFetch(`/api/v1/appointments${buildScopedQuery(normalized)}`);
}

export async function getActiveAppointments(params: Omit<ScopeParams, 'page'> = {}) {
  return apiFetch(`/api/v1/appointments/active${buildScopedQuery(params)}`);
}

export async function getAuditLogs(page = 1) {
  // requires admin role
  const end_time = new Date().toISOString();
  const start_time = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return apiFetch(`/api/v1/audit-logs?page=${page}&start_time=${start_time}&end_time=${end_time}`);
}

export async function getUsers(page = 1) {
  return apiFetch(`/api/v1/users?page=${page}`);
}

export async function getVehicles(params: ScopeParams | number = 1) {
  const normalized = typeof params === 'number' ? { page: params } : params;
  return apiFetch(`/api/v1/vehicles${buildScopedQuery(normalized)}`);
}

export async function getServiceTypes(page = 1) {
  return apiFetch(`/api/v1/service-types?page=${page}`);
}

const entityPathMap: Record<string, string> = {
  'Technicians': '/api/v1/technicians',
  'ServiceBays': '/api/v1/service-bays',
  'Appointments': '/api/v1/appointments',
  'Tenants': '/api/v1/tenants',
  'Users': '/api/v1/users',
  'Vehicles': '/api/v1/vehicles',
  'ServiceTypes': '/api/v1/service-types',
};

export async function createEntity(entityType: string, payload: any) {
  const path = entityPathMap[entityType];
  if (!path) throw new Error(`Unknown entity type: ${entityType}`);
  
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEntity(entityType: string, id: string, payload: any) {
  let path = entityPathMap[entityType];
  if (!path) throw new Error(`Unknown entity type: ${entityType}`);
  
  if (entityType === 'Appointments') {
    // Appointments only support patching status
    path = `${path}/${id}/status`;
    return apiFetch(path, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  return apiFetch(`${path}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteEntity(entityType: string, id: string) {
  const path = entityPathMap[entityType];
  if (!path) throw new Error(`Unknown entity type: ${entityType}`);
  
  return apiFetch(`${path}/${id}`, {
    method: 'DELETE',
  });
}

export async function switchTenantApi(targetTenantId: string, refreshToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/switch-tenant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ targetTenantId, refreshToken }),
  });
  if (!response.ok) throw new Error('Failed to switch tenant');
  return response.json();
}

export async function assignUserToTenant(userId: string, role: string) {
  return apiFetch(`/api/v1/users`, {
    method: 'POST',
    body: JSON.stringify({ userId, role }),
  });
}

export async function promoteUserToManager(userId: string) {
  return apiFetch(`/api/v1/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role: 'TenantManager' }),
  });
}

export async function getTenantUsers() {
  return apiFetch(`/api/v1/users`);
}

export async function getOccupiedSlots(resourceType: 'technicians' | 'service-bays', id: string, date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch(`/api/v1/${resourceType}/${id}/occupied${query}`);
}
