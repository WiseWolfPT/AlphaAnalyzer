import React from 'react';

export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => setIsClient(true), []);
  // Use a wrapper with suppressHydrationWarning to avoid noisy mismatches
  return (
    <div suppressHydrationWarning>
      {isClient ? children : fallback}
    </div>
  );
}

