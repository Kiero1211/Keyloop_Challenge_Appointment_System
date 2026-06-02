import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthSession } from './types';

interface AuthContextType extends AuthSession {
  login: (token: string) => void;
  logout: () => void;
  setTenant: (tenantId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>({
    token: localStorage.getItem('token'),
    tenant_id: localStorage.getItem('tenant_id'),
    status: localStorage.getItem('token') ? 'logged_in' : 'logged_out',
  });

  const login = (token: string) => {
    localStorage.setItem('token', token);
    setSession((prev) => ({ ...prev, token, status: 'logged_in' }));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenant_id');
    setSession({ token: null, tenant_id: null, status: 'logged_out' });
  };

  const setTenant = (tenantId: string) => {
    localStorage.setItem('tenant_id', tenantId);
    setSession((prev) => ({ ...prev, tenant_id: tenantId }));
  };

  return (
    <AuthContext.Provider value={{ ...session, login, logout, setTenant }}>
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
