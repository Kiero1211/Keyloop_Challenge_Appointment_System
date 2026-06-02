import { useState, useEffect } from 'react';
import { 
  getCustomers, 
  getVehicles, 
  getServiceTypes, 
  getTechnicians, 
  getServiceBays, 
  holdAppointmentResource 
} from '../api';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export function AppointmentModal({ isOpen, onClose, onSubmit }: AppointmentModalProps) {
  const [loadingLists, setLoadingLists] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [serviceBays, setServiceBays] = useState<any[]>([]);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [desiredStartTime, setDesiredStartTime] = useState('');
  const [autoAssigned, setAutoAssigned] = useState(false);
  
  const [technicianId, setTechnicianId] = useState('');
  const [serviceBayId, setServiceBayId] = useState('');
  
  const [technicianHolId, setTechnicianHolId] = useState('');
  const [serviceBayHoldId, setServiceBayHoldId] = useState('');

  // Fetch options when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingLists(true);
      Promise.all([
        getCustomers(1),
        getVehicles(1),
        getServiceTypes(1),
        getTechnicians(1),
        getServiceBays(1)
      ]).then(([custRes, vehRes, stRes, techRes, bayRes]) => {
        const getList = (res: any) => Array.isArray(res) ? res : res.items || res.data || [];
        setCustomers(getList(custRes));
        setVehicles(getList(vehRes));
        setServiceTypes(getList(stRes));
        setTechnicians(getList(techRes));
        setServiceBays(getList(bayRes));
      }).catch(err => {
        console.error("Failed to load options", err);
      }).finally(() => {
        setLoadingLists(false);
      });
    } else {
      // Reset form when closed
      setCustomerId('');
      setVehicleId('');
      setServiceTypeId('');
      setDesiredStartTime('');
      setAutoAssigned(false);
      setTechnicianId('');
      setServiceBayId('');
      setTechnicianHolId('');
      setServiceBayHoldId('');
    }
  }, [isOpen]);

  const handleTechnicianChange = async (newTechId: string) => {
    setTechnicianId(newTechId);
    if (newTechId && !autoAssigned) {
      try {
        const res = await holdAppointmentResource({ technicianId: newTechId });
        setTechnicianHolId(res.holdId);
      } catch (err) {
        alert("Failed to hold technician slot. It may be occupied.");
        setTechnicianId('');
        setTechnicianHolId('');
      }
    } else {
      setTechnicianHolId('');
    }
  };

  const handleServiceBayChange = async (newBayId: string) => {
    setServiceBayId(newBayId);
    if (newBayId && !autoAssigned) {
      try {
        const res = await holdAppointmentResource({ serviceBayId: newBayId });
        setServiceBayHoldId(res.holdId);
      } catch (err) {
        alert("Failed to hold service bay slot. It may be occupied.");
        setServiceBayId('');
        setServiceBayHoldId('');
      }
    } else {
      setServiceBayHoldId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Construct payload strictly matching the backend schema
    const payload: any = {
      customerId,
      vehicleId,
      serviceTypeId,
      desiredStartTime: new Date(desiredStartTime).toISOString(),
      autoAssigned
    };

    if (!autoAssigned) {
      if (technicianHolId) payload.technicianHolId = technicianHolId;
      if (serviceBayHoldId) payload.serviceBayHoldId = serviceBayHoldId;
      if (technicianId) payload.technicianId = technicianId;
      if (serviceBayId) payload.serviceBayId = serviceBayId;
    }

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', padding: '20px', borderRadius: '8px',
        width: '500px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2 style={{ marginTop: 0 }}>Create Appointment</h2>
        
        {loadingLists ? (
          <p>Loading options...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 'bold' }}>Customer</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} required style={{ padding: '8px' }}>
                <option value="" disabled>-- Select Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 'bold' }}>Vehicle</label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required style={{ padding: '8px' }}>
                <option value="" disabled>-- Select Vehicle --</option>
                {vehicles
                  .filter(v => !customerId || v.customerId === customerId) // Filter vehicles by customer if selected
                  .map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate})</option>)
                }
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 'bold' }}>Service Type</label>
              <select value={serviceTypeId} onChange={e => setServiceTypeId(e.target.value)} required style={{ padding: '8px' }}>
                <option value="" disabled>-- Select Service Type --</option>
                {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.name} ({st.estimatedDurationMinutes} mins)</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 'bold' }}>Desired Start Time</label>
              <input 
                type="datetime-local" 
                value={desiredStartTime} 
                onChange={e => setDesiredStartTime(e.target.value)} 
                required 
                style={{ padding: '8px' }} 
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="autoAssignCheckbox"
                checked={autoAssigned} 
                onChange={e => {
                  setAutoAssigned(e.target.checked);
                  if (e.target.checked) {
                    setTechnicianId('');
                    setServiceBayId('');
                    setTechnicianHolId('');
                    setServiceBayHoldId('');
                  }
                }} 
              />
              <label htmlFor="autoAssignCheckbox" style={{ fontWeight: 'bold', cursor: 'pointer' }}>
                Auto-Assign Technician & Service Bay
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 'bold', color: autoAssigned ? '#aaa' : '#000' }}>Technician</label>
              <select 
                value={technicianId} 
                onChange={e => handleTechnicianChange(e.target.value)} 
                required={!autoAssigned}
                disabled={autoAssigned}
                style={{ padding: '8px' }}
              >
                <option value="" disabled>-- Select Technician --</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 'bold', color: autoAssigned ? '#aaa' : '#000' }}>Service Bay</label>
              <select 
                value={serviceBayId} 
                onChange={e => handleServiceBayChange(e.target.value)} 
                required={!autoAssigned}
                disabled={autoAssigned}
                style={{ padding: '8px' }}
              >
                <option value="" disabled>-- Select Service Bay --</option>
                {serviceBays.map(sb => <option key={sb.id} value={sb.id}>{sb.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button 
                type="button" 
                onClick={onClose} 
                disabled={submitting}
                style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                style={{ padding: '8px 16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {submitting ? 'Saving...' : 'Create'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
