import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useApi = () => {
  const { token } = useAuth();
  const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `API error: ${res.status}`);
    }
    return res.json();
  };
  return { apiFetch };
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const base64 = storedToken.split('.')[1];
          const payload = JSON.parse(atob(base64));
          setUser(payload);
        } catch (err) {
          console.error('Failed to parse token', err);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const value = {
    token,
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};