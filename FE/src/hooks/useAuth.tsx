import { createContext, useContext, useState } from 'react';

interface AuthContextType {
  token: string | null;
  user: any | null;
  login: (token: string, user: any) => void;
  updateUser: (user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getSanitizedToken = (): string | null => {
  try {
    const raw = localStorage.getItem('token');
    if (!raw || raw === 'undefined' || raw === 'null' || raw.trim() === '') {
      localStorage.removeItem('token');
      return null;
    }
    return raw;
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') {
      localStorage.removeItem('user');
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getSanitizedToken());
  const [user, setUser] = useState<any | null>(getStoredUser());

  const login = (newToken: string, newUser: any) => {
    if (!newToken || newToken === 'undefined' || newToken === 'null') {
      console.error("Attempted to set invalid token during login");
      return;
    }
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const updateUser = (newUser: any) => {
    setUser((prev: any) => {
      const updated = prev ? { ...prev, ...newUser } : newUser;
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
