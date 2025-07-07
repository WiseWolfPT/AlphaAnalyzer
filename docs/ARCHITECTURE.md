# Alfalyzer Architecture Guide

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Data Flow](#data-flow)
- [API Integration Strategy](#api-integration-strategy)
- [Security Architecture](#security-architecture)
- [Performance Considerations](#performance-considerations)
- [Deployment Architecture](#deployment-architecture)
- [Architecture Decision Records](#architecture-decision-records)

## Overview

Alfalyzer is built as a modern, scalable financial analysis platform using a microservices-inspired monolithic architecture. This approach provides the simplicity of a monolith with clear service boundaries that can be extracted to microservices if needed.

### Key Architectural Principles

1. **Separation of Concerns**: Clear boundaries between presentation, business logic, and data layers
2. **API-First Design**: All features exposed through REST APIs
3. **Real-time Capabilities**: WebSocket support for live market data
4. **Resilience**: Multiple fallback strategies for external dependencies
5. **Security by Design**: Authentication and authorization at every layer
6. **Performance Optimization**: Aggressive caching and lazy loading
7. **Developer Experience**: TypeScript throughout, consistent patterns

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │   Web   │  │   PWA   │  │ Mobile  │  │  Admin  │      │
│  │  (React)│  │         │  │  (Future)│  │  Panel  │      │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘      │
└───────┼────────────┼────────────┼────────────┼────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                          │
                    ┌─────▼─────┐
                    │   CDN     │
                    │ (Static)  │
                    └─────┬─────┘
                          │
        ┌─────────────────▼─────────────────┐
        │         Load Balancer             │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │         API Gateway               │
        │    (Express Middleware)           │
        └─────────────────┬─────────────────┘
                          │
    ┌─────────┬───────────┼───────────┬─────────┐
    │         │           │           │         │
┌───▼───┐ ┌──▼──┐ ┌──────▼─────┐ ┌──▼──┐ ┌───▼───┐
│ Auth  │ │Stock│ │ Portfolio  │ │Trans│ │Admin  │
│Service│ │ API │ │  Service   │ │cript│ │ API   │
└───┬───┘ └──┬──┘ └──────┬─────┘ └──┬──┘ └───┬───┘
    │         │           │           │         │
    └─────────┴───────────┴───────────┴─────────┘
                          │
                    ┌─────▼─────┐
                    │  Database │
                    │   Layer   │
                    └─────┬─────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐    ┌─────▼─────┐   ┌─────▼─────┐
    │ SQLite  │    │ Supabase  │   │   Redis   │
    │  (Dev)  │    │   (Prod)  │   │  (Cache)  │
    └─────────┘    └───────────┘   └───────────┘
```

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── ui/                 # Base UI components (shadcn/ui)
│   ├── common/            # Shared components
│   ├── features/          # Feature-specific components
│   │   ├── dashboard/
│   │   ├── portfolio/
│   │   ├── watchlist/
│   │   └── transcripts/
│   └── layouts/           # Layout components
├── hooks/                 # Custom React hooks
├── contexts/              # React contexts
├── services/              # API service layer
├── lib/                   # Utilities and helpers
├── pages/                 # Route components
└── types/                 # TypeScript definitions
```

### State Management

We use a hybrid approach for state management:

1. **Server State**: React Query for API data
2. **UI State**: React Context for global UI state
3. **Local State**: useState/useReducer for component state

```typescript
// Example: Stock data hook with React Query
export function useStockData(symbol: string) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => stockService.getQuote(symbol),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}

// Example: Global UI context
export const UIContext = React.createContext({
  theme: 'dark',
  sidebarOpen: true,
  toggleSidebar: () => {},
});
```

### Routing Strategy

We use Wouter for routing due to its simplicity and small bundle size:

```typescript
// App.tsx
import { Route, Switch } from 'wouter';

function App() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/stock/:symbol" component={StockDetail} />
      <Route path="/admin/*" component={AdminPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}
```

## Backend Architecture

### Service Layer Pattern

Each major feature is organized as a service with clear responsibilities:

```
server/
├── routes/               # Express route handlers
│   ├── auth.ts
│   ├── stocks.ts
│   ├── portfolios.ts
│   └── transcripts.ts
├── services/             # Business logic
│   ├── auth/
│   ├── market-data/
│   ├── portfolio/
│   └── transcript/
├── middleware/           # Express middleware
│   ├── auth.ts
│   ├── rate-limit.ts
│   └── validation.ts
├── db/                   # Database layer
│   ├── schema.ts
│   ├── migrations/
│   └── queries/
└── types/                # Shared types
```

### Database Strategy

We use a dual-database approach:

1. **Development**: SQLite for simplicity
2. **Production**: Supabase (PostgreSQL) for scalability

```typescript
// Database abstraction layer
export interface DatabaseAdapter {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

// Implementation selected based on environment
const db: DatabaseAdapter = process.env.NODE_ENV === 'production'
  ? new SupabaseAdapter()
  : new SQLiteAdapter();
```

## Data Flow

### Real-time Stock Data Flow

```
User Request → API Gateway → Cache Check → 
  ↓ (cache miss)
  Market Data Service → API Manager →
    ↓ (try each provider)
    Alpha Vantage API
    ↓ (fallback if failed)
    Finnhub API
    ↓ (fallback if failed)
    FMP API
    ↓
  Response → Cache Update → Client
```

### Transcript Processing Flow

```
Admin Upload → Validation → Database Storage →
  ↓
  Background Job Queue →
    ↓
    ChatGPT Integration →
      ↓
      Summary Generation →
        ↓
        Database Update → Publish → User Access
```

## API Integration Strategy

### Multi-Provider Fallback System

```typescript
class MarketDataService {
  private providers = [
    new AlphaVantageProvider(),
    new FinnhubProvider(),
    new FMPProvider(),
    new TwelveDataProvider(),
  ];

  async getQuote(symbol: string): Promise<StockQuote> {
    for (const provider of this.providers) {
      try {
        if (await provider.isHealthy()) {
          return await provider.getQuote(symbol);
        }
      } catch (error) {
        logger.warn(`Provider ${provider.name} failed`, error);
        continue;
      }
    }
    throw new Error('All providers failed');
  }
}
```

### Rate Limiting Strategy

Each API provider has different rate limits:

```typescript
const rateLimits = {
  alphaVantage: { calls: 5, window: 60 }, // 5 per minute
  finnhub: { calls: 60, window: 60 },     // 60 per minute
  fmp: { calls: 250, window: 86400 },     // 250 per day
  twelveData: { calls: 800, window: 86400 }, // 800 per day
};
```

## Security Architecture

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│   API    │────▶│ Supabase │
│          │     │ Gateway  │     │   Auth   │
└──────────┘     └──────────┘     └──────────┘
     │                 │                 │
     │   JWT Token    │    Validate     │
     │◀───────────────┤◀────────────────┤
     │                 │                 │
     │   Request      │                 │
     │────────────────▶│                 │
     │                 │                 │
     │   Protected    │                 │
     │   Resource     │                 │
     │◀────────────────┤                 │
```

### Security Layers

1. **Transport**: HTTPS everywhere
2. **Authentication**: JWT tokens with Supabase Auth
3. **Authorization**: Role-based access control (RBAC)
4. **Input Validation**: Zod schemas for all inputs
5. **SQL Injection**: Parameterized queries
6. **XSS Prevention**: Content Security Policy
7. **Rate Limiting**: Per-user and per-endpoint

## Performance Considerations

### Caching Strategy

```typescript
// Multi-level caching
class CacheManager {
  private memoryCache = new LRUCache({ max: 1000 });
  private redisClient = new Redis();

  async get(key: string): Promise<any> {
    // L1: Memory cache
    const memResult = this.memoryCache.get(key);
    if (memResult) return memResult;

    // L2: Redis cache
    const redisResult = await this.redisClient.get(key);
    if (redisResult) {
      this.memoryCache.set(key, redisResult);
      return redisResult;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number) {
    this.memoryCache.set(key, value);
    await this.redisClient.setex(key, ttl, value);
  }
}
```

### Optimization Techniques

1. **Code Splitting**: Dynamic imports for routes
2. **Lazy Loading**: Components loaded on demand
3. **Image Optimization**: WebP format, responsive images
4. **Bundle Optimization**: Tree shaking, minification
5. **Database Indexing**: Indexes on frequently queried columns
6. **Connection Pooling**: Reuse database connections
7. **CDN**: Static assets served from edge

## Deployment Architecture

### Production Infrastructure

```
┌─────────────────┐     ┌─────────────────┐
│     Vercel      │     │    Railway      │
│   (Frontend)    │     │   (Backend)     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │  Supabase   │
              │ (Database)  │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   Upstash   │
              │   (Redis)   │
              └─────────────┘
```

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci --production
      - uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## Architecture Decision Records

### ADR-001: Use Wouter Instead of React Router

**Status**: Accepted  
**Date**: 2024-01-15

**Context**: Need a routing solution for the React application.

**Decision**: Use Wouter instead of React Router.

**Consequences**:
- ✅ Smaller bundle size (9KB vs 40KB)
- ✅ Simpler API
- ✅ No breaking changes between versions
- ❌ Less ecosystem support
- ❌ Fewer advanced features

### ADR-002: SQLite for Development, Supabase for Production

**Status**: Accepted  
**Date**: 2024-01-20

**Context**: Need a database solution that's easy for development but scalable for production.

**Decision**: Use SQLite locally and Supabase in production.

**Consequences**:
- ✅ Zero-config local development
- ✅ Production-ready PostgreSQL
- ✅ Built-in auth and real-time
- ❌ Need to maintain two migration sets
- ❌ Potential SQL compatibility issues

### ADR-003: React Query for Server State Management

**Status**: Accepted  
**Date**: 2024-01-25

**Context**: Need a solution for managing server state and API calls.

**Decision**: Use React Query (TanStack Query) for all API interactions.

**Consequences**:
- ✅ Built-in caching and synchronization
- ✅ Optimistic updates
- ✅ Background refetching
- ✅ Reduced boilerplate
- ❌ Additional dependency
- ❌ Learning curve for team

### ADR-004: Multi-API Provider Strategy

**Status**: Accepted  
**Date**: 2024-02-01

**Context**: Financial APIs have rate limits and reliability issues.

**Decision**: Implement multiple API providers with automatic fallback.

**Consequences**:
- ✅ Higher reliability
- ✅ Better rate limit management
- ✅ No single point of failure
- ❌ Increased complexity
- ❌ Need to normalize different response formats
- ❌ Higher operational costs

### ADR-005: Monolithic Architecture with Service Boundaries

**Status**: Accepted  
**Date**: 2024-02-10

**Context**: Need to balance development speed with future scalability.

**Decision**: Build as a monolith with clear service boundaries.

**Consequences**:
- ✅ Faster initial development
- ✅ Simpler deployment
- ✅ Easier debugging
- ✅ Can extract to microservices later
- ❌ Potential scaling limitations
- ❌ Shared failure domain

---

This architecture provides a solid foundation for growth while maintaining simplicity and developer productivity. Each decision is made with both current needs and future scalability in mind.