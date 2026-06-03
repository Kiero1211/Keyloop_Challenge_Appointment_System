import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useAuth } from '@/useAuth';
import { getAllTenants, switchTenantApi } from '@/api';

interface Tenant {
  id: string;
  name: string;
}

export function TenantSelector() {
  const { tenant_id, setTenant, isSuperAdmin, login } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTenants(1)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.items || data.data || [];
        setTenants(list.map((t: any) => ({ id: t.id, name: t.name })) || []);
      })
      .catch((err) => {
        console.error('Failed to fetch tenants:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value.length == 0) return;
    if (value) {
      if (isSuperAdmin) {
        setTenant(value);
      } else {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token available');
          const data = await switchTenantApi(value, refreshToken);
          if (data.accessToken) {
            if (data.refreshToken) {
              localStorage.setItem('refreshToken', data.refreshToken);
            }
            login(data.accessToken, value, isSuperAdmin);
          }
        } catch (err) {
          console.error('Failed to switch tenant via API:', err);
          // Fallback just in case
          setTenant(value);
        }
      }
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
          {tenants.length > 0 && tenants.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.id})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
