import React, { useEffect } from 'react';
import { QueryClient } from '@tanstack/react-query';

interface QueryDebugWrapperProps {
  children: React.ReactNode;
  queryClient: QueryClient;
}

export const QueryDebugWrapper: React.FC<QueryDebugWrapperProps> = ({ children, queryClient }) => {
  useEffect(() => {
    console.log('🔍 QueryDebugWrapper mounted');
    console.log('QueryClient instance:', queryClient);
    console.log('QueryClient default options:', queryClient.getDefaultOptions());
    
    // Add global error handler for React Query
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'queryFailed') {
        console.error('❌ Query failed:', {
          queryKey: event.query.queryKey,
          error: event.query.state.error,
        });
      }
    });

    return () => {
      console.log('🔍 QueryDebugWrapper unmounting');
      unsubscribe();
    };
  }, [queryClient]);

  // Add error boundary specifically for React Query errors
  try {
    return <>{children}</>;
  } catch (error) {
    if (error instanceof Error && error.message.includes('QueryClient')) {
      console.error('🚨 React Query Error caught in wrapper:', error);
      return (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="font-bold">React Query Error</h2>
          <p>{error.message}</p>
          <p className="text-sm mt-2">Check console for more details</p>
        </div>
      );
    }
    throw error;
  }
};