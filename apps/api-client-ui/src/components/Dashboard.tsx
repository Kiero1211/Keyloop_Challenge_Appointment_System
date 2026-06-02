import { useState, useEffect } from 'react';
import type { EntityType } from '../types';
import { getTechnicians, getServiceBays, getAppointments, getAuditLogs } from '../api';
import { DataTable } from './DataTable';

export function Dashboard() {
  const [currentEntity, setCurrentEntity] = useState<EntityType>('Technicians');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
  }, [currentEntity, page]);

  const tabs: EntityType[] = ['Technicians', 'ServiceBays', 'Appointments', 'AuditLogs'];

  return (
    <div>
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
      <DataTable data={data} error={error} loading={loading} />
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
    </div>
  );
}
