import { useState, useEffect } from 'react';
import type { EntityType } from '../types';
import { getTechnicians, getServiceBays, getAppointments, getAuditLogs, getAllTenants, getCustomers, getVehicles, getServiceTypes, createEntity, updateEntity, deleteEntity, assignUserToTenant, promoteUserToManager, getTenantUsers } from '../api';
import { DataTable } from './DataTable';
import { CrudModal } from './CrudModal';
import { entitySchemas } from '../formSchemas';
import { useAuth } from '../useAuth';

export function Dashboard() {
  const { isSuperAdmin, tenant_id, setTenant, role } = useAuth();
  const [currentEntity, setCurrentEntity] = useState<EntityType>('Technicians');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [adminTenants, setAdminTenants] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Role Management State
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('TenantUser');
  const [promoteUserId, setPromoteUserId] = useState('');
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  const handleAssignUser = async (e: any) => {
    e.preventDefault();
    if (!tenant_id) return alert('Please select a tenant first');
    try {
      await assignUserToTenant(tenant_id, assignUserId, assignRole);
      alert('User assigned successfully');
      setAssignUserId('');
    } catch(err: any) { alert(err.message); }
  };

  const handlePromoteUser = async (e: any) => {
    e.preventDefault();
    if (!tenant_id) return alert('Please select a tenant first');
    try {
      await promoteUserToManager(tenant_id, promoteUserId);
      alert('User promoted successfully');
      setPromoteUserId('');
    } catch(err: any) { alert(err.message); }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      // Fetch all tenants to populate the dropdown
      getAllTenants(1).then(res => {
        const list = Array.isArray(res) ? res : res.items || res.data || [];
        setAdminTenants(list);
      }).catch(console.error);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (currentEntity === 'RoleManagement' && tenant_id) {
      getTenantUsers(tenant_id).then(res => {
        setTenantUsers(Array.isArray(res) ? res : res.data || []);
      }).catch(console.error);
    }
  }, [currentEntity, tenant_id, refreshTrigger]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setData([]);

    let fetcher: (page: number) => Promise<any>;
    switch (currentEntity) {
      case 'Technicians':
        fetcher = getTechnicians;
        break;
      case 'ServiceBays':
        fetcher = getServiceBays;
        break;
      case 'Appointments':
        fetcher = getAppointments;
        break;
      case 'AuditLogs':
        fetcher = getAuditLogs;
        break;
      case 'Customers':
        fetcher = getCustomers;
        break;
      case 'Vehicles':
        fetcher = getVehicles;
        break;
      case 'ServiceTypes':
        fetcher = getServiceTypes;
        break;
      case 'Tenants':
        fetcher = isSuperAdmin ? getAllTenants : async () => [];
        break;
      default:
        fetcher = async () => [];
    }

    fetcher(page)
      .then(res => {
        if (active) {
          // Normalize response format assuming list might be wrapped or plain array
          const list = Array.isArray(res) ? res : res.items || res.data || [];
          setData(list);
          if (res.total && res.pageSize) {
            setTotalPages(Math.ceil(res.total / res.pageSize));
          } else {
            setTotalPages(1);
          }
        }
      })
      .catch(err => {
        if (active) {
          setError(err);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentEntity, page, tenant_id, refreshTrigger]); // re-fetch when tenant switches or refresh triggered

  const handleEdit = (row: any) => {
    setSelectedRow(row);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Are you sure you want to delete this ${currentEntity}?`)) return;
    try {
      await deleteEntity(currentEntity, row.id);
      refreshData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleModalSubmit = async (payload: any) => {
    try {
      if (modalMode === 'create') {
        await createEntity(currentEntity, payload);
      } else {
        await updateEntity(currentEntity, selectedRow.id, payload);
      }
      refreshData();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
      throw err;
    }
  };

  const handleInsertNew = () => {
    setSelectedRow(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const getSchema = () => {
    if (currentEntity === 'Appointments') {
      return modalMode === 'create' ? entitySchemas['AppointmentsCreate'] : entitySchemas['AppointmentsUpdate'];
    }
    return entitySchemas[currentEntity] || [];
  };

  const tabs: EntityType[] = ['Technicians', 'ServiceBays', 'Appointments', 'AuditLogs', 'Customers', 'Vehicles', 'ServiceTypes'];
  if (isSuperAdmin) {
    tabs.push('Tenants');
  }
  if (isSuperAdmin || role === 'TenantManager') {
    tabs.push('RoleManagement');
  }

  if (role === 'Guest') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
        <h2>You are a guest, please wait before being allocated to a tenant</h2>
      </div>
    );
  }

  return (
    <div>
      {isSuperAdmin && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Tenant:</label>
          <select 
            value={tenant_id || ''} 
            onChange={(e) => setTenant(e.target.value)}
            style={{ padding: '8px', minWidth: '200px' }}
          >
            <option value="">-- All Tenants (Global View) --</option>
            {adminTenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => {
              setCurrentEntity(tab);
              setPage(1);
            }}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              background: currentEntity === tab ? '#007bff' : '#e0e0e0',
              color: currentEntity === tab ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {currentEntity !== 'AuditLogs' && currentEntity !== 'RoleManagement' && (
        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={handleInsertNew}
            style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Insert New {currentEntity}
          </button>
        </div>
      )}

      {currentEntity === 'RoleManagement' ? (
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', minWidth: '300px' }}>
            <h3>Assign User to Tenant</h3>
            <form onSubmit={handleAssignUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="User ID (UUID)" value={assignUserId} onChange={e => setAssignUserId(e.target.value)} required style={{ padding: '8px' }} />
              <select value={assignRole} onChange={e => setAssignRole(e.target.value)} style={{ padding: '8px' }}>
                <option value="TenantUser">Tenant User</option>
                <option value="TenantManager">Tenant Manager</option>
              </select>
              <button type="submit" style={{ padding: '8px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none' }}>Assign User</button>
            </form>
          </div>
          
          <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', minWidth: '300px' }}>
            <h3>Promote User to Tenant Manager</h3>
            <form onSubmit={handlePromoteUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select value={promoteUserId} onChange={e => setPromoteUserId(e.target.value)} required style={{ padding: '8px' }}>
                <option value="" disabled>-- Select a User --</option>
                {tenantUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
              <button type="submit" style={{ padding: '8px', cursor: 'pointer', background: '#28a745', color: '#fff', border: 'none' }}>Promote to Manager</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <DataTable 
            data={data} 
            error={error} 
            loading={loading} 
            onEdit={currentEntity !== 'AuditLogs' ? handleEdit : undefined}
            onDelete={currentEntity !== 'AuditLogs' ? handleDelete : undefined}
          />
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              style={{ padding: '8px 16px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              style={{ padding: '8px 16px', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </>
      )}

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        title={modalMode === 'create' ? `Create ${currentEntity}` : `Edit ${currentEntity}`}
        schema={getSchema()}
        initialData={selectedRow}
      />
    </div>
  );
}
