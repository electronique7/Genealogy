import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('auth_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const resp = await apiLogin(username, password);
    localStorage.setItem('auth_token', resp.token);
    const u = { id: resp.id, username: resp.username, role: resp.role, email: resp.email };
    setUser(u);
    return u;
  }

  async function logout() {
    localStorage.removeItem('auth_token');
    try { await apiLogout(); } catch (_) {}
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function canEdit(user) {
  return user?.role === 'admin' || user?.role === 'editor';
}
