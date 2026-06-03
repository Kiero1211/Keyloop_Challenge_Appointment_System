import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthSession } from '@/types';

interface AuthContextType extends AuthSession {
  login: (token: string, tenantId: string | null, isSuperAdmin: boolean) => void;
  logout: () => void;
  setTenant: (tenantId: string) => void;
  userId: string | null;
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialToken = localStorage.getItem('token');
  const [session, setSession] = useState<AuthSession>({
    token: initialToken,
    tenant_id: localStorage.getItem('tenant_id'),
    role: initialToken ? parseJwt(initialToken)?.role || null : null,
    isSuperAdmin: localStorage.getItem('isSuperAdmin') === 'true',
    status: localStorage.getItem('token') ? 'logged_in' : 'logged_out',
  });

  const login = (token: string, tenantId: string | null, isSuperAdmin: boolean) => {
    localStorage.setItem('token', token);
    if (tenantId) {
      localStorage.setItem('tenant_id', tenantId);
    }
    localStorage.setItem('isSuperAdmin', String(isSuperAdmin));
    const role = parseJwt(token)?.role || null;
    setSession((prev) => ({ ...prev, token, tenant_id: tenantId, role, isSuperAdmin, status: 'logged_in' }));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('isSuperAdmin');
    setSession({ token: null, tenant_id: null, role: null, isSuperAdmin: false, status: 'logged_out' });
  };

  const setTenant = (tenantId: string) => {
    localStorage.setItem('tenant_id', tenantId);
    setSession((prev) => ({ ...prev, tenant_id: tenantId }));
  };

  const userId = session.token ? parseJwt(session.token)?.sub || null : null;

  return (
    <AuthContext.Provider value={{ ...session, userId, login, logout, setTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
