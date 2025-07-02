import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface SimpleAuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  toggleAuthState: () => void;
}

const SimpleAuthContext = createContext<SimpleAuthContextType>({
  user: null,
  token: null,
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
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate a JWT-like token for demo purposes
  const generateToken = (user: User): string => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    // Simple base64 encoding for demo (not cryptographically secure)
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = btoa(`alfalyzer-${user.id}-${Date.now()}`);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  };

  useEffect(() => {
    // Check for saved user and token in localStorage
    const savedUser = localStorage.getItem('alfalyzer-user');
    const savedToken = localStorage.getItem('alfalyzer-token');
    
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(savedToken);
        setLoading(false);
        return;
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('alfalyzer-user');
        localStorage.removeItem('alfalyzer-token');
      }
    }
    
    // Auto-login demo user for development to enable real data
    const demoUser: User = {
      id: 'demo-user-' + Date.now(),
      name: 'Demo User',
      email: 'demo@alfalyzer.com'
    };
    
    const demoToken = generateToken(demoUser);
    setUser(demoUser);
    setToken(demoToken);
    
    // Store for persistence
    localStorage.setItem('alfalyzer-user', JSON.stringify(demoUser));
    localStorage.setItem('alfalyzer-token', demoToken);
    localStorage.setItem('auth-token', demoToken);
    
    setLoading(false);
  }, []);

  const signOut = async () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('alfalyzer-user');
    localStorage.removeItem('alfalyzer-token');
    localStorage.removeItem('auth-token');
  };

  const signIn = async (email: string, password: string) => {
    // Demo credentials
    if ((email === 'demo@alfalyzer.com' && password === 'demo123') ||
        (email === 'admin@alfalyzer.com' && password === 'admin123') ||
        (email === 'beta@alfalyzer.com' && password === '123demo') ||
        (email === 'test@test.com' && password === 'test123')) {
      
      const demoUser: User = {
        id: 'demo-user-' + Date.now(),
        name: email === 'admin@alfalyzer.com' ? 'Admin User' : 
              email === 'beta@alfalyzer.com' ? 'António Francisco (Beta)' : 'Demo User',
        email: email,
        avatar: email === 'admin@alfalyzer.com' ? 'AU' : 
                email === 'beta@alfalyzer.com' ? 'AF' : 'DU'
      };
      
      const authToken = generateToken(demoUser);
      
      setUser(demoUser);
      setToken(authToken);
      localStorage.setItem('alfalyzer-user', JSON.stringify(demoUser));
      localStorage.setItem('alfalyzer-token', authToken);
      localStorage.setItem('auth-token', authToken); // For market data client
      return {};
    }
    
    return { error: 'Credenciais inválidas. Use beta@alfalyzer.com / 123demo' };
  };

  const register = async (name: string, email: string, password: string) => {
    // Simple registration simulation
    const newUser: User = {
      id: 'user-' + Date.now(),
      name: name,
      email: email,
      avatar: name.charAt(0).toUpperCase()
    };
    
    const authToken = generateToken(newUser);
    
    setUser(newUser);
    setToken(authToken);
    localStorage.setItem('alfalyzer-user', JSON.stringify(newUser));
    localStorage.setItem('alfalyzer-token', authToken);
    localStorage.setItem('auth-token', authToken); // For market data client
    return {};
  };

  // Demo toggle for development
  const toggleAuthState = () => {
    if (user) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('alfalyzer-user');
      localStorage.removeItem('alfalyzer-token');
      localStorage.removeItem('auth-token');
    } else {
      const demoUser: User = {
        id: 'demo-1',
        name: 'João Silva (Demo)',
        email: 'joao@demo.com',
        avatar: 'JS'
      };
      const authToken = generateToken(demoUser);
      
      setUser(demoUser);
      setToken(authToken);
      localStorage.setItem('alfalyzer-user', JSON.stringify(demoUser));
      localStorage.setItem('alfalyzer-token', authToken);
      localStorage.setItem('auth-token', authToken);
    }
  };

  return (
    <SimpleAuthContext.Provider value={{ 
      user, 
      token,
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