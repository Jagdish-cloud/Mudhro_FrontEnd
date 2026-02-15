import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize token synchronously from sessionStorage to avoid race condition with PrivateRoute
  // Use lazy initialization to read from sessionStorage on first render only
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('client_token');
  });

  const login = (newToken: string) => {
    setToken(newToken);
    sessionStorage.setItem('client_token', newToken);
  };

  const logout = () => {
    setToken(null);
    sessionStorage.removeItem('client_token');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
