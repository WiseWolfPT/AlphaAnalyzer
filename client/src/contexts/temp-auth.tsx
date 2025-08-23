import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signUp: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: async () => {},
      signOut: async () => {},
      signUp: async () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
}