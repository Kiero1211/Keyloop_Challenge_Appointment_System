import { useState } from 'react';
import { AuthProvider, useAuth } from './useAuth';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { TenantSelector } from './components/TenantSelector';
import { Dashboard } from './components/Dashboard';

function Main() {
  const { status, tenant_id, logout } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  if (status === 'logged_out') {
    if (isRegistering) {
      return <Register onToggleToLogin={() => setIsRegistering(false)} />;
    }
    return <Login onToggleToRegister={() => setIsRegistering(true)} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>API Client UI</h1>
        <button onClick={logout} style={{ padding: '8px' }}>Logout</button>
      </div>
      
      {!tenant_id ? (
        <TenantSelector />
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <p><strong>Current Tenant:</strong> {tenant_id}</p>
            <button onClick={() => { localStorage.removeItem('tenant_id'); window.location.reload(); }} style={{ padding: '4px' }}>Change Tenant</button>
          </div>
          <hr />
          <Dashboard />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}

export default App;
