import type { ReactNode } from 'react';
import { SupabaseAuthProvider, useSupabaseAuth } from '@/contexts/supabase-auth-context';

/**
 * @deprecated Utilize `useSupabaseAuth` diretamente.
 * Este wrapper existe apenas para garantir compatibilidade temporária.
 */
export const useAuth = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Deprecated] useAuth de "@/contexts/temp-auth" foi substituído por useSupabaseAuth. Atualize os imports.');
  }
  return useSupabaseAuth();
};

/**
 * @deprecated Utilize `SupabaseAuthProvider` diretamente.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Deprecated] AuthProvider de "temp-auth" reexporta SupabaseAuthProvider. Atualize os providers.');
  }
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
}
