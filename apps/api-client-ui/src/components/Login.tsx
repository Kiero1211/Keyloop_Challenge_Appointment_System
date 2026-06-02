import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../useAuth';
import { API_BASE_URL } from '../api';

interface LoginProps {
  onToggleToRegister: () => void;
}

export function Login({ onToggleToRegister }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setError(null);
    setLoading(true);

    try {
      // Assuming api.ts has a login function exported
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (!res.ok) {
        throw new Error('Login failed');
      }

      const data = await res.json();
      if (data.accessToken) {
        login(data.accessToken);
      } else {
        setError('No token returned');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', borderRadius: '4px', background: '#fff' }}>
      <h2>Login</h2>
      <p>Enter your email and password to login</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" 
          style={{ padding: '8px' }}
        />
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" 
          style={{ padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <div style={{ marginTop: '10px' }}>
        <button onClick={onToggleToRegister} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0 }}>
          Don't have an account? Register here.
        </button>
      </div>
    </div>
  );
}
