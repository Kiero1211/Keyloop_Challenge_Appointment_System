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

export async function getTechnicians(page = 1) {
  return apiFetch(`/api/v1/technicians?page=${page}`);
}

export async function getServiceBays(page = 1) {
  return apiFetch(`/api/v1/service-bays?page=${page}`);
}

export async function getAppointments(page = 1) {
  return apiFetch(`/api/v1/appointments?page=${page}`);
}

export async function getAuditLogs(page = 1) {
  const tenantId = localStorage.getItem('tenant_id');
  return apiFetch(`/api/v1/tenants/${tenantId}/audit-logs?page=${page}`);
}
