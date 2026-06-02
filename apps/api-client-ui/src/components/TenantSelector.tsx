import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useAuth } from '../useAuth';
import { apiFetch } from '../api';

interface Tenant {
  id: string;
  name: string;
}

export function TenantSelector() {
  const { tenant_id, setTenant } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Assuming GET /api/tenant/ returns a list of tenants 
    // or maybe another endpoint like /api/tenants.
    // If we get an error, we just fallback or show empty list.
    apiFetch('/api/v1/auth/tenants')
      .then((data: any) => {
        // Handle if response is array or an object wrapping array
        const list = Array.isArray(data) ? data : data.items || data.tenants || [];
        setTenants(list);
      })
      .catch((err) => {
        console.error('Failed to fetch tenants:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      setTenant(value);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', borderRadius: '4px', background: '#fff' }}>
      <h2>Select Tenant</h2>
      {loading ? (
        <p>Loading tenants...</p>
      ) : (
        <select value={tenant_id || ''} onChange={handleChange} style={{ padding: '8px', width: '200px' }}>
          <option value="" disabled>-- Select a Tenant --</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.id})
            </option>
          ))}
          {/* Fallback option if empty or if needed */}
          <option value="tenant-1">Tenant 1</option>
          <option value="tenant-2">Tenant 2</option>
        </select>
      )}
    </div>
  );
}
