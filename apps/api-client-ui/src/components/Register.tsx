import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../useAuth';
import { API_BASE_URL } from '../api';

interface RegisterProps {
  onToggleToLogin: () => void;
}

export function Register({ onToggleToLogin }: RegisterProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: email.trim(), 
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Registration failed');
      }

      const data = await res.json();
      if (data.accessToken) {
        login(data.accessToken);
      } else {
        setError('No token returned');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', borderRadius: '4px', background: '#fff' }}>
      <h2>Register</h2>
      <p>Enter your details to create an account</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input 
          type="text" 
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name" 
          style={{ padding: '8px' }}
          required
        />
        <input 
          type="text" 
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last Name" 
          style={{ padding: '8px' }}
          required
        />
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" 
          style={{ padding: '8px' }}
          required
        />
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" 
          style={{ padding: '8px' }}
          required
        />
        <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }} disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <div style={{ marginTop: '10px' }}>
        <button onClick={onToggleToLogin} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0 }}>
          Already have an account? Login here.
        </button>
      </div>
    </div>
  );
}
