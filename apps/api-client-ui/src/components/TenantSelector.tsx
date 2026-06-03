import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useAuth } from '@/useAuth';
import { getAllTenants, getTenants, switchTenantApi } from '@/api';

interface Tenant {
  id: string;
  name: string;
}

type TenantListItem = {
  id?: string;
  name?: string;
  tenantId?: string;
  tenantName?: string;
};

export function TenantSelector() {
  const { tenant_id, setTenant, isSuperAdmin, role, login } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdmin = isSuperAdmin || role === 'Admin';
    const fetchTenants = isAdmin ? getAllTenants : getTenants;

    fetchTenants(1)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.items || data.data || [];
        setTenants(list
          .map((t: TenantListItem) => ({
            id: t.id || t.tenantId || '',
            name: t.name || t.tenantName || '',
          }))
          .filter((t: Tenant) => t.id && t.name));
      })
      .catch((err) => {
        console.error('Failed to fetch tenants:', err);
        setTenants([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isSuperAdmin, role]);

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
      ) : tenants.length === 0 ? (
        <p>No tenants available for the current user.</p>
      ) : (
        <select value={tenant_id || ''} onChange={handleChange} style={{ padding: '8px', width: '200px' }}>
          <option value="" disabled>-- Select a Tenant --</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.id})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
