# Alfalyzer Database Architecture Analysis

## Current Database Setup Analysis

### Existing Configuration
- **Current ORM**: Drizzle ORM with PostgreSQL schema definitions
- **Development DB**: SQLite (better-sqlite3) for demo purposes
- **Production target**: PostgreSQL (configured in drizzle.config.ts)
- **Authentication**: Supabase Auth with custom user context
- **State management**: Simple React context for auth state

### Current Schema Structure
The existing schema includes:
- `stocks`: Basic stock information with financial metrics
- `watchlists`: User-specific stock watchlists
- `watchlist_stocks`: Junction table for watchlist-stock relationships
- `intrinsic_values`: Calculated intrinsic value data
- `earnings`: Earnings data and estimates
- `recent_searches`: User search history

### Identified Gaps
1. **User Management**: No comprehensive user profile system
2. **Subscription Management**: Basic subscription schema but no database persistence
3. **Portfolio Tracking**: Missing portfolio holdings and transactions
4. **Audit Trails**: No compliance or audit logging
5. **Performance Optimization**: No caching layer integration
6. **Financial Data Compliance**: Missing regulatory compliance features

## Enhanced Database Architecture Design

### 1. User Management & Authentication
Based on Prisma/TypeORM research, implementing comprehensive user management:

```sql
-- Enhanced Users table with subscription integration
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    country_code VARCHAR(2),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Subscription management
    subscription_tier subscription_tier_enum NOT NULL DEFAULT 'free',
    subscription_status subscription_status_enum NOT NULL DEFAULT 'active',
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    trial_end_date TIMESTAMP,
    whop_order_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    
    -- User preferences
    preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    
    -- Security & compliance
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Indexes
    INDEX idx_users_email (email),
    INDEX idx_users_subscription (subscription_tier, subscription_status),
    INDEX idx_users_created_at (created_at)
);

-- Subscription tiers enum
CREATE TYPE subscription_tier_enum AS ENUM ('free', 'premium', 'whop_community', 'enterprise');

-- Subscription status enum  
CREATE TYPE subscription_status_enum AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');
```

### 2. Subscription Management System
Enhanced subscription system with multiple providers:

```sql
-- Subscription plans configuration
CREATE TABLE subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    billing_interval billing_interval_enum NOT NULL,
    trial_days INTEGER DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]',
    limits JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    stripe_price_id VARCHAR(255),
    whop_product_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription history for audit trail
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_tier subscription_tier_enum,
    new_tier subscription_tier_enum NOT NULL,
    old_status subscription_status_enum,
    new_status subscription_status_enum NOT NULL,
    change_reason VARCHAR(100),
    payment_method VARCHAR(50),
    amount_cents INTEGER,
    currency VARCHAR(3),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_subscription_history_user (user_id),
    INDEX idx_subscription_history_created (created_at)
);

CREATE TYPE billing_interval_enum AS ENUM ('month', 'year', 'lifetime');
```

### 3. Portfolio & Holdings Management
Comprehensive portfolio tracking system:

```sql
-- User portfolios
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'USD',
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    benchmark_symbol VARCHAR(10) DEFAULT 'SPY',
    
    -- Performance tracking
    total_value_cents BIGINT DEFAULT 0,
    total_cost_cents BIGINT DEFAULT 0,
    total_return_cents BIGINT DEFAULT 0,
    total_return_percent DECIMAL(10,4) DEFAULT 0,
    day_change_cents BIGINT DEFAULT 0,
    day_change_percent DECIMAL(10,4) DEFAULT 0,
    
    -- Risk metrics
    beta DECIMAL(10,4),
    sharpe_ratio DECIMAL(10,4),
    volatility DECIMAL(10,4),
    max_drawdown DECIMAL(10,4),
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(user_id, name),
    INDEX idx_portfolios_user (user_id),
    INDEX idx_portfolios_updated (updated_at)
);

-- Portfolio holdings
CREATE TABLE portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    
    -- Position details
    quantity DECIMAL(15,6) NOT NULL,
    average_cost_cents BIGINT NOT NULL,
    current_price_cents BIGINT,
    market_value_cents BIGINT,
    unrealized_pnl_cents BIGINT DEFAULT 0,
    realized_pnl_cents BIGINT DEFAULT 0,
    
    -- Position metrics
    weight_percent DECIMAL(5,2),
    day_change_cents BIGINT DEFAULT 0,
    day_change_percent DECIMAL(10,4) DEFAULT 0,
    
    -- Dates
    first_purchase_date DATE,
    last_transaction_date DATE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(portfolio_id, symbol),
    INDEX idx_holdings_portfolio (portfolio_id),
    INDEX idx_holdings_symbol (symbol),
    INDEX idx_holdings_updated (updated_at)
);

-- Portfolio transactions
CREATE TABLE portfolio_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    
    -- Transaction details
    transaction_type transaction_type_enum NOT NULL,
    quantity DECIMAL(15,6) NOT NULL,
    price_cents BIGINT NOT NULL,
    fees_cents BIGINT DEFAULT 0,
    total_amount_cents BIGINT NOT NULL,
    
    -- Transaction metadata
    transaction_date DATE NOT NULL,
    notes TEXT,
    broker VARCHAR(50),
    account_id VARCHAR(100),
    reference_id VARCHAR(100),
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_transactions_portfolio (portfolio_id),
    INDEX idx_transactions_symbol (symbol),
    INDEX idx_transactions_date (transaction_date),
    INDEX idx_transactions_type (transaction_type)
);

CREATE TYPE transaction_type_enum AS ENUM ('buy', 'sell', 'dividend', 'split', 'merger', 'spinoff');
```

### 4. Enhanced Watchlists System
Building on existing watchlist functionality:

```sql
-- Enhanced watchlists (building on existing structure)
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS color VARCHAR(7); -- Hex color code
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Watchlist performance tracking
CREATE TABLE watchlist_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Performance metrics
    total_return_percent DECIMAL(10,4),
    day_change_percent DECIMAL(10,4),
    best_performer_symbol VARCHAR(10),
    worst_performer_symbol VARCHAR(10),
    avg_pe_ratio DECIMAL(10,4),
    avg_market_cap_millions BIGINT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(watchlist_id, date),
    INDEX idx_watchlist_perf_date (date)
);
```

### 5. Financial Data & Analytics
Enhanced financial data management:

```sql
-- Enhanced stock data
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS sector_id INTEGER;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS industry_id INTEGER;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS country VARCHAR(2);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS exchange VARCHAR(10);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS market_cap_tier market_cap_tier_enum;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS dividend_yield DECIMAL(5,4);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS beta DECIMAL(10,4);

-- Financial ratios and metrics
CREATE TABLE stock_fundamentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER,
    
    -- Income statement
    revenue_cents BIGINT,
    gross_profit_cents BIGINT,
    operating_income_cents BIGINT,
    net_income_cents BIGINT,
    eps DECIMAL(10,4),
    
    -- Balance sheet
    total_assets_cents BIGINT,
    total_debt_cents BIGINT,
    shareholders_equity_cents BIGINT,
    book_value_per_share DECIMAL(10,4),
    
    -- Cash flow
    operating_cash_flow_cents BIGINT,
    free_cash_flow_cents BIGINT,
    capital_expenditures_cents BIGINT,
    
    -- Ratios
    pe_ratio DECIMAL(10,4),
    pb_ratio DECIMAL(10,4),
    debt_to_equity DECIMAL(10,4),
    roe DECIMAL(10,4),
    roa DECIMAL(10,4),
    current_ratio DECIMAL(10,4),
    
    -- Dates
    report_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(symbol, fiscal_year, fiscal_quarter),
    INDEX idx_fundamentals_symbol (symbol),
    INDEX idx_fundamentals_year (fiscal_year)
);

CREATE TYPE market_cap_tier_enum AS ENUM ('nano', 'micro', 'small', 'mid', 'large', 'mega');
```

### 6. Audit Trail & Compliance System
Comprehensive audit logging for regulatory compliance:

```sql
-- Audit log for all user actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User context
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    
    -- Request context
    request_id VARCHAR(255),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    
    -- Compliance fields
    compliance_reason VARCHAR(100),
    data_classification VARCHAR(50) DEFAULT 'internal',
    retention_period_days INTEGER DEFAULT 2555, -- 7 years
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_session (session_id)
);

-- Data access log for sensitive financial data
CREATE TABLE data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Access details
    data_type VARCHAR(50) NOT NULL, -- 'stock_price', 'portfolio', 'financial_data'
    data_identifier VARCHAR(255), -- symbol, portfolio_id, etc.
    access_reason VARCHAR(100),
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    
    -- Compliance
    authorized BOOLEAN DEFAULT TRUE,
    authorization_method VARCHAR(50),
    data_sensitivity VARCHAR(20) DEFAULT 'public',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_data_access_user (user_id),
    INDEX idx_data_access_type (data_type),
    INDEX idx_data_access_created (created_at)
);

-- User consent and privacy management
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Consent details
    consent_type VARCHAR(50) NOT NULL, -- 'privacy_policy', 'terms_of_service', 'marketing', 'data_processing'
    consent_version VARCHAR(20) NOT NULL,
    granted BOOLEAN NOT NULL,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    method VARCHAR(50), -- 'explicit', 'implicit', 'opt_out'
    
    -- Timestamps
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_consent_user (user_id),
    INDEX idx_consent_type (consent_type),
    INDEX idx_consent_granted (granted_at)
);
```

### 7. Caching Integration Schema
Database-level caching and performance optimization:

```sql
-- Cache management table
CREATE TABLE cache_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    
    -- Cache metadata
    cache_type VARCHAR(50) NOT NULL, -- 'stock_price', 'fundamentals', 'user_data'
    ttl_seconds INTEGER NOT NULL,
    tags VARCHAR(255)[], -- For cache invalidation
    
    -- Performance tracking
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    INDEX idx_cache_key (cache_key),
    INDEX idx_cache_type (cache_type),
    INDEX idx_cache_expires (expires_at),
    INDEX idx_cache_tags USING GIN (tags)
);

-- API rate limiting and usage tracking
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    -- API details
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    api_key_id VARCHAR(255),
    
    -- Usage metrics
    requests_count INTEGER DEFAULT 1,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    
    -- Rate limiting
    rate_limit_window VARCHAR(20), -- 'minute', 'hour', 'day'
    rate_limit_remaining INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_start TIMESTAMP,
    
    INDEX idx_usage_user (user_id),
    INDEX idx_usage_endpoint (endpoint),
    INDEX idx_usage_window (window_start),
    INDEX idx_usage_created (created_at)
);
```

## Migration Strategy

### Phase 1: Core User Management (Week 1)
1. Implement enhanced users table
2. Add subscription management tables
3. Migrate existing user data from Supabase

### Phase 2: Portfolio System (Week 2)
1. Create portfolio and holdings tables
2. Implement transaction tracking
3. Build portfolio analytics

### Phase 3: Enhanced Analytics (Week 3)
1. Expand stock fundamentals
2. Add performance tracking
3. Implement watchlist analytics

### Phase 4: Compliance & Audit (Week 4)
1. Deploy audit logging system
2. Implement data access controls
3. Add consent management

### Phase 5: Performance Optimization (Week 5)
1. Implement caching layer
2. Add API usage tracking
3. Optimize database indexes

## Performance Considerations

### Indexing Strategy
- Primary indexes on all foreign keys
- Composite indexes for common query patterns
- Partial indexes for soft-deleted records
- GIN indexes for JSONB columns and arrays

### Partitioning Strategy
- Partition audit_logs by month
- Partition portfolio_transactions by year
- Partition cache_entries by cache_type

### Caching Strategy
- Redis for session data and real-time quotes
- Database-level caching for fundamentals
- CDN caching for static financial data
- In-memory caching for user preferences

## Security & Compliance

### Data Classification
- **Public**: Stock prices, basic company info
- **Internal**: User preferences, watchlists
- **Confidential**: Portfolio holdings, transactions
- **Restricted**: PII, payment information

### Retention Policies
- Audit logs: 7 years (regulatory requirement)
- Transaction data: 10 years
- User activity: 2 years
- Cache data: Dynamic based on TTL

### Privacy Controls
- GDPR-compliant user consent management
- Data anonymization for analytics
- Right to erasure implementation
- Data portability features

This comprehensive database architecture provides a solid foundation for the Alfalyzer financial application, addressing current gaps while ensuring scalability, compliance, and performance optimization.