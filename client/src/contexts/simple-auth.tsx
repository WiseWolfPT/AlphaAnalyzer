import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SimpleAuthContextType {
  user: any | null;
  loading: boolean;
  signOut: () => void;
}

const SimpleAuthContext = createContext<SimpleAuthContextType>({
  user: null,
  loading: false,
  signOut: () => {},
});

export const useAuth = () => useContext(SimpleAuthContext);

interface SimpleAuthProviderProps {
  children: ReactNode;
}

export function SimpleAuthProvider({ children }: SimpleAuthProviderProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate auth check
    setTimeout(() => {
      setLoading(false);
      // For demo purposes, set a mock user
      setUser({ email: 'demo@alphaanalyzer.com', id: '1' });
    }, 100);
  }, []);

  const signOut = () => {
    setUser(null);
    // Redirect to landing page
    window.location.href = '/';
  };

  return (
    <SimpleAuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </SimpleAuthContext.Provider>
  );
}