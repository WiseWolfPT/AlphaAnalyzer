# Vercel Authorization Header Bug - Solution Documentation

## Problem

Vercel has a known bug where it removes the `Authorization` header from incoming requests in production environments. This causes authentication to fail even when the client correctly sends the token.

## Solution Overview

We implemented a dual-header approach that automatically detects the environment and uses the appropriate header:

- **Development**: Uses standard `Authorization` header
- **Production (Vercel)**: Uses custom `X-Auth-Token` header

## Implementation Details

### 1. Client-Side (Frontend)

#### Auth Header Utility (`client/src/lib/auth-headers.ts`)

```typescript
// Detects Vercel production environment
export function isVercelProduction(): boolean {
  return (
    import.meta.env.PROD || 
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('.vercel.app') ||
    (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'))
  );
}

// Creates headers with appropriate auth header
export function createAuthHeaders(token?: string | null, additionalHeaders?: Record<string, string>): Record<string, string> {
  const config = getAuthHeaderConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  if (token) {
    headers[config.headerName] = `Bearer ${token}`;
  }
  
  return headers;
}
```

#### Market Data Client Update

The `market-data-client.ts` now uses the auth header utility:

```typescript
private async fetchWithAuth(url: string, options?: RequestInit) {
  const headers = createAuthHeaders(this.authToken, options?.headers as Record<string, string>);
  
  return fetch(url, {
    ...options,
    headers,
    mode: 'cors',
    credentials: 'omit',
  });
}
```

#### Axios Client Wrapper (`client/src/lib/axios-client.ts`)

For services using axios, we created a wrapper with automatic header management:

```typescript
export function createAxiosClient(baseURL?: string): AxiosInstance {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('alfalyzer-token');
    if (token && config.headers) {
      const authConfig = getAuthHeaderConfig();
      config.headers[authConfig.headerName] = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}
```

### 2. Server-Side (Backend)

#### Auth Middleware Update (`server/middleware/auth.ts`)

The auth middleware now accepts both headers:

```typescript
function extractToken(req: Request): string | null {
  // Try Authorization header first (for development)
  const authHeader = req.headers.authorization;
  
  // Try X-Auth-Token header (for Vercel production)
  const xAuthToken = req.headers['x-auth-token'] as string;
  
  // Use whichever header is present
  const tokenHeader = authHeader || xAuthToken;
  
  if (!tokenHeader) {
    return null;
  }
  
  // Log which header was used for debugging
  if (xAuthToken && !authHeader) {
    console.log('🔐 Using X-Auth-Token header (Vercel workaround)');
  } else if (authHeader) {
    console.log('🔐 Using Authorization header');
  }
  
  // Extract Bearer token
  if (tokenHeader.startsWith('Bearer ')) {
    return tokenHeader.substring(7);
  }
  
  return tokenHeader;
}
```

## Environment Detection

The solution automatically detects the environment using multiple checks:

1. `import.meta.env.PROD` - Vite production flag
2. `window.location.hostname.includes('vercel.app')` - Vercel domains
3. `window.location.hostname !== 'localhost'` - Not local development
4. `!window.location.hostname.includes('127.0.0.1')` - Not local IP

## Usage

### For New Services

Use the provided utilities:

```typescript
import { createAuthHeaders } from '@/lib/auth-headers';

// For fetch
const headers = createAuthHeaders(token);
const response = await fetch(url, { headers });

// For axios
import { createAxiosClient } from '@/lib/axios-client';
const client = createAxiosClient('https://api.example.com');
```

### For Existing Services

Update to use the auth header utility instead of hardcoding headers.

## Testing

Run the test suite:

```bash
npm test -- auth-headers.test.ts
```

## Debugging

The solution includes extensive logging:

- Client logs which header is being used
- Server logs which header was received
- Configuration details are logged on initialization

## Migration Guide

1. Replace hardcoded `Authorization` headers with `createAuthHeaders()`
2. Update axios instances to use `createAxiosClient()`
3. Ensure backend middleware is updated to accept both headers
4. Test in both development and production environments

## Known Limitations

1. This is a workaround for Vercel's bug - the ideal solution would be Vercel fixing the issue
2. Some third-party services may not accept custom headers
3. CORS policies must allow the `X-Auth-Token` header

## References

- [Vercel GitHub Issue](https://github.com/vercel/vercel/discussions/5054)
- [Similar Solutions](https://github.com/vercel/next.js/discussions/33650)