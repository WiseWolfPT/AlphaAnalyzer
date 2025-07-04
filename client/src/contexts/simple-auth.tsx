import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface SimpleAuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  toggleAuthState: () => void;
}

const SimpleAuthContext = createContext<SimpleAuthContextType>({
  user: null,
  loading: false,
  signOut: async () => {},
  signIn: async () => ({}),
  register: async () => ({}),
  toggleAuthState: () => {},
});

export const useAuth = () => useContext(SimpleAuthContext);

interface SimpleAuthProviderProps {
  children: ReactNode;
}

export function SimpleAuthProvider({ children }: SimpleAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user in localStorage
    const savedUser = localStorage.getItem('alfalyzer-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('alfalyzer-user');
      }
    }
    setLoading(false);
  }, []);

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('alfalyzer-user');
  };

  const signIn = async (email: string, password: string) => {
    // Demo mode - accepts any email/password for testing
    if (email && password) {
      const demoUser: User = {
        id: 'demo-user-' + Date.now(),
        name: 'Demo User',
        email: email,
        avatar: email.charAt(0).toUpperCase()
      };
      
      setUser(demoUser);
      localStorage.setItem('alfalyzer-user', JSON.stringify(demoUser));
      return {};
    }
    
    return { error: 'Por favor, insira email e senha' };
  };

  const register = async (name: string, email: string, password: string) => {
    // Simple registration simulation
    const newUser: User = {
      id: 'user-' + Date.now(),
      name: name,
      email: email,
      avatar: name.charAt(0).toUpperCase()
    };
    
    setUser(newUser);
    localStorage.setItem('alfalyzer-user', JSON.stringify(newUser));
    return {};
  };

  // Demo toggle for development
  const toggleAuthState = () => {
    if (user) {
      setUser(null);
      localStorage.removeItem('alfalyzer-user');
    } else {
      const demoUser: User = {
        id: 'demo-1',
        name: 'João Silva (Demo)',
        email: 'joao@demo.com',
        avatar: 'JS'
      };
      setUser(demoUser);
      localStorage.setItem('alfalyzer-user', JSON.stringify(demoUser));
    }
  };

  return (
    <SimpleAuthContext.Provider value={{ 
      user, 
      loading, 
      signOut, 
      signIn, 
      register,
      toggleAuthState 
    }}>
      {children}
    </SimpleAuthContext.Provider>
  );
}