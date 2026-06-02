import { useEffect, useState } from 'react';
import { getOccupiedSlots } from '@/api';

type ResourceType = 'technicians' | 'service-bays';

interface OccupiedSlotsPanelProps {
  resourceType: ResourceType;
  resourceId: string;
  date?: string;
  title: string;
}

interface OccupiedSlot {
  appointmentId: string;
  startTime: string;
  endTime: string;
}

export function OccupiedSlotsPanel({ resourceType, resourceId, date, title }: OccupiedSlotsPanelProps) {
  const [slots, setSlots] = useState<OccupiedSlot[]>([]);

  useEffect(() => {
    if (!resourceId) {
      setSlots([]);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const response = await getOccupiedSlots(resourceType, resourceId, date);
        const list = response?.occupiedSlots || [];
        if (active) {
          setSlots(list);
        }
      } catch (error) {
        if (active) {
          console.error('Failed to load occupied slots', error);
          setSlots([]);
        }
      }
    };

    void load();
    const interval = window.setInterval(load, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [resourceType, resourceId, date]);

  if (!resourceId) return null;

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fafafa' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {slots.length === 0 ? (
        <div style={{ color: '#666', fontSize: 14 }}>No occupied slots for this day.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {slots.map(slot => (
            <div key={slot.appointmentId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
              <span>{slot.appointmentId}</span>
              <span>{new Date(slot.startTime).toLocaleString()} - {new Date(slot.endTime).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
