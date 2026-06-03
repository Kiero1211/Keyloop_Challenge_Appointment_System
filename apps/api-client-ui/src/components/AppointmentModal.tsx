import { useState, useEffect } from 'react';
import { useAuth } from '@/useAuth';
import { 
  getUsers,
  getVehicles, 
  getServiceTypes, 
  getTechnicians, 
  getAvailableTechnicians,
  getServiceBays, 
  getOccupiedSlots
} from '@/api';
import { OccupiedSlotsPanel } from '@/components/OccupiedSlotsPanel';

function slotsOverlap(slotStart: string, slotEnd: string, start: Date, end: Date) {
  const occupiedStart = new Date(slotStart).getTime();
  const occupiedEnd = new Date(slotEnd).getTime();
  return occupiedStart < end.getTime() && occupiedEnd > start.getTime();
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export function AppointmentModal({ isOpen, onClose, onSubmit }: AppointmentModalProps) {
  const { role, userId } = useAuth();
  const [loadingLists, setLoadingLists] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lists
  const [users, setUsers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [serviceBays, setServiceBays] = useState<any[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<any[]>([]);
  const [availableServiceBays, setAvailableServiceBays] = useState<any[]>([]);

  // Form State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [desiredStartTime, setDesiredStartTime] = useState('');
  const [autoAssigned, setAutoAssigned] = useState(false);
  
  const [technicianId, setTechnicianId] = useState('');
  const [serviceBayId, setServiceBayId] = useState('');

  // Fetch options when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingLists(true);
      const isElevated = role === 'TenantManager' || role === 'Admin';
      Promise.all([
        isElevated ? getUsers(1) : Promise.resolve([]),
        getVehicles(1),
        getServiceTypes(1),
        getTechnicians(1),
        getServiceBays(1)
      ]).then(([userRes, vehRes, stRes, techRes, bayRes]) => {
        const getList = (res: any) => Array.isArray(res) ? res : res.items || res.data || [];
        setUsers(getList(userRes));
        setVehicles(getList(vehRes));
        setServiceTypes(getList(stRes));
        setTechnicians(getList(techRes));
        setServiceBays(getList(bayRes));
        setAvailableTechnicians(getList(techRes));
        setAvailableServiceBays(getList(bayRes));
        setSelectedUserId(isElevated ? '' : (userId || ''));
      }).catch(err => {
        console.error("Failed to load options", err);
      }).finally(() => {
        setLoadingLists(false);
      });
    } else {
      // Reset form when closed
      setSelectedUserId('');
      setVehicleId('');
      setServiceTypeId('');
      setDesiredStartTime('');
      setAutoAssigned(false);
      setTechnicianId('');
      setServiceBayId('');
      setAvailableTechnicians([]);
      setAvailableServiceBays([]);
    }
  }, [isOpen, role, userId]);

  const handleTechnicianChange = (newTechId: string) => {
    setTechnicianId(newTechId);
  };

  const handleServiceBayChange = (newBayId: string) => {
    setServiceBayId(newBayId);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (!serviceTypeId || !desiredStartTime) {
      setAvailableTechnicians(technicians);
      setAvailableServiceBays(serviceBays);
      return;
    }

    const selectedServiceType = serviceTypes.find(st => st.id === serviceTypeId);
    const durationMinutes = selectedServiceType?.estimatedDurationMinutes;
    if (!durationMinutes) {
      setAvailableTechnicians(technicians);
      setAvailableServiceBays(serviceBays);
      return;
    }

    const start = new Date(desiredStartTime);
    if (Number.isNaN(start.getTime())) {
      setAvailableTechnicians(technicians);
      setAvailableServiceBays(serviceBays);
      return;
    }

    const end = new Date(start.getTime() + durationMinutes * 60000);
    const day = desiredStartTime.split('T')[0];
    let active = true;

    const refreshAvailability = async () => {
      try {
        const [techSlots, baySlots] = await Promise.all([
          getAvailableTechnicians(start.toISOString(), end.toISOString(), serviceTypeId),
          Promise.all(serviceBays.map(async bay => ({
            id: bay.id,
            occupiedSlots: (await getOccupiedSlots('service-bays', bay.id, day)).occupiedSlots || [],
          }))),
        ]);

        if (!active) return;

        const getList = (res: any) => Array.isArray(res) ? res : res.items || res.data || [];
        const filteredTechnicians = getList(techSlots);

        const filteredServiceBays = serviceBays.filter(bay => {
          const slots = baySlots.find(entry => entry.id === bay.id)?.occupiedSlots || [];
          return !slots.some((slot: any) => slotsOverlap(slot.startTime, slot.endTime, start, end));
        });

        setAvailableTechnicians(filteredTechnicians);
        setAvailableServiceBays(filteredServiceBays);

        if (technicianId && !filteredTechnicians.some((tech: any) => tech.id === technicianId)) {
          setTechnicianId('');
        }

        if (serviceBayId && !filteredServiceBays.some(bay => bay.id === serviceBayId)) {
          setServiceBayId('');
        }
      } catch (error) {
        console.error('Failed to refresh resource availability', error);
        if (active) {
          setAvailableTechnicians(technicians);
          setAvailableServiceBays(serviceBays);
        }
      }
    };

    void refreshAvailability();
    return () => {
      active = false;
    };
  }, [isOpen, serviceTypeId, desiredStartTime, technicians, serviceBays, serviceTypes, technicianId, serviceBayId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Construct payload strictly matching the backend schema
    const payload: any = {
      userId: selectedUserId || userId,
      vehicleId,
      serviceTypeId,
      desiredStartTime: new Date(desiredStartTime).toISOString(),
      autoAssigned,
      technicianId: autoAssigned ? undefined : technicianId,
      serviceBayId: autoAssigned ? undefined : serviceBayId,
    };

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
              <label style={{ fontWeight: 'bold' }}>User</label>
              {(role === 'TenantUser' || role === 'Guest') ? (
                <input value={selectedUserId} readOnly style={{ padding: '8px' }} />
              ) : (
                <select value={selectedUserId} onChange={e => {
                  setSelectedUserId(e.target.value);
                  setVehicleId('');
                }} required style={{ padding: '8px' }}>
                  <option value="" disabled>-- Select User --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 'bold' }}>Vehicle</label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required style={{ padding: '8px' }}>
                <option value="" disabled>-- Select Vehicle --</option>
                {vehicles
                  .filter(v => !selectedUserId || v.userId === selectedUserId)
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
                {availableTechnicians.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
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
                {availableServiceBays.map(sb => <option key={sb.id} value={sb.id}>{sb.name}</option>)}
              </select>
            </div>

            {!autoAssigned && technicianId && (
              <OccupiedSlotsPanel
                resourceType="technicians"
                resourceId={technicianId}
                date={desiredStartTime ? desiredStartTime.split('T')[0] : undefined}
                title="Technician occupied windows"
              />
            )}

            {!autoAssigned && serviceBayId && (
              <OccupiedSlotsPanel
                resourceType="service-bays"
                resourceId={serviceBayId}
                date={desiredStartTime ? desiredStartTime.split('T')[0] : undefined}
                title="Service bay occupied windows"
              />
            )}

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
