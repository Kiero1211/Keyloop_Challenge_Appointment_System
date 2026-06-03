import { useState, useEffect } from 'react';
import type { FormField } from '@/formSchemas';

interface CrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  title: string;
  schema: FormField[];
  initialData?: any;
}

export function CrudModal({ isOpen, onClose, onSubmit, title, schema, initialData }: CrudModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Typecasting for specific fields if needed
      const payload = { ...formData };
      schema.forEach(field => {
        if (field.type === 'number' && payload[field.name]) {
          payload[field.name] = Number(payload[field.name]);
        }
        if (field.type === 'datetime-local' && payload[field.name]) {
          // ensure it's a valid ISO string
          payload[field.name] = new Date(payload[field.name]).toISOString();
        }
      });
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', padding: '20px', borderRadius: '8px', minWidth: '400px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2>{title}</h2>
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {schema.map(field => {
            // For datetime-local, we need to format existing ISO strings to YYYY-MM-DDThh:mm
            let val = formData[field.name] || '';
            if (field.type === 'datetime-local' && val) {
              try {
                val = new Date(val).toISOString().slice(0, 16);
              } catch {
                // Keep the original value when it cannot be parsed as a date.
              }
            }

            return (
              <div key={field.name} style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                </label>
                <input
                  type={field.type}
                  name={field.name}
                  required={field.required}
                  value={field.type !== 'checkbox' ? val : undefined}
                  checked={field.type === 'checkbox' ? !!formData[field.name] : undefined}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
            );
          })}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
