# Database Migration Patterns for Alfalyzer

## Migration Strategy Overview

### Phase-Based Migration Approach
This migration strategy ensures minimal downtime and maintains data integrity while transitioning from the current simple SQLite setup to a comprehensive PostgreSQL-based financial application database.

## Phase 1: Core User Management Migration

### 1.1 User Table Enhancement
```sql
-- Migration: 001_enhance_users_table.sql
-- Add new columns to existing users table (if using PostgreSQL)
-- Or create enhanced users table and migrate data

-- Step 1: Create enhanced users table
CREATE TABLE users_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Migration from existing Supabase auth
    supabase_id UUID UNIQUE, -- Map to existing Supabase user IDs
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    country_code VARCHAR(2),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Subscription management (new)
    subscription_tier subscription_tier_enum NOT NULL DEFAULT 'free',
    subscription_status subscription_status_enum NOT NULL DEFAULT 'active',
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    trial_end_date TIMESTAMP,
    whop_order_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    
    -- User preferences (new)
    preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    
    -- Security & compliance (new)
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Step 2: Data migration from Supabase
-- This will be handled in application code to fetch from Supabase API
-- and populate the enhanced users table

-- Step 3: Create indexes
CREATE INDEX idx_users_email ON users_enhanced(email);
CREATE INDEX idx_users_subscription ON users_enhanced(subscription_tier, subscription_status);
CREATE INDEX idx_users_created_at ON users_enhanced(created_at);
CREATE INDEX idx_users_supabase_id ON users_enhanced(supabase_id);
```

### 1.2 Subscription Management Tables
```sql
-- Migration: 002_subscription_management.sql

-- Subscription plans
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

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, price_cents, billing_interval, features, limits) VALUES
('free', 'Free Tier', 'Basic access to Alfalyzer', 0, 'month', 
 '["3 watchlists", "1 portfolio", "Basic analytics"]',
 '{"maxWatchlists": 3, "maxPortfolios": 1, "maxHoldingsPerPortfolio": 10}'),
('premium_monthly', 'Premium Monthly', 'Full access to Alfalyzer', 2999, 'month',
 '["Unlimited watchlists", "Advanced analytics", "Real-time data", "Export capabilities"]',
 '{"maxWatchlists": 20, "maxPortfolios": 10, "maxHoldingsPerPortfolio": 100}'),
('premium_annual', 'Premium Annual', 'Best value - 2 months free!', 29999, 'year',
 '["All Premium features", "2 months free", "Priority support"]',
 '{"maxWatchlists": 20, "maxPortfolios": 10, "maxHoldingsPerPortfolio": 100}'),
('whop_community', 'Whop Community', '7-day free trial with community access', 0, 'month',
 '["Community access", "Discord integration", "Exclusive courses", "Market analysis"]',
 '{"maxWatchlists": 10, "maxPortfolios": 5, "maxHoldingsPerPortfolio": 50, "trialDays": 7}');

-- Subscription history
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_enhanced(id) ON DELETE CASCADE,
    old_tier subscription_tier_enum,
    new_tier subscription_tier_enum NOT NULL,
    old_status subscription_status_enum,
    new_status subscription_status_enum NOT NULL,
    change_reason VARCHAR(100),
    payment_method VARCHAR(50),
    amount_cents INTEGER,
    currency VARCHAR(3),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_created ON subscription_history(created_at);
```

### 1.3 Data Migration Scripts
```javascript
// migration-scripts/001_migrate_supabase_users.js
import { supabase } from '../client/src/lib/supabase.js';
import { db } from '../server/db.js';

async function migrateSupabaseUsers() {
  try {
    // Fetch all users from Supabase
    const { data: supabaseUsers, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;
    
    console.log(`Found ${supabaseUsers.users.length} users to migrate`);
    
    for (const supabaseUser of supabaseUsers.users) {
      // Map Supabase user to enhanced schema
      const enhancedUser = {
        supabase_id: supabaseUser.id,
        email: supabaseUser.email,
        full_name: supabaseUser.user_metadata?.full_name || null,
        avatar_url: supabaseUser.user_metadata?.avatar_url || null,
        email_verified: supabaseUser.email_confirmed_at !== null,
        last_login_at: supabaseUser.last_sign_in_at,
        created_at: supabaseUser.created_at,
        updated_at: supabaseUser.updated_at,
        
        // Default subscription settings
        subscription_tier: 'free',
        subscription_status: 'active',
        subscription_start_date: supabaseUser.created_at,
        
        // Default preferences
        preferences: {},
        notification_settings: {
          email_notifications: true,
          price_alerts: true,
          portfolio_updates: true
        }
      };
      
      // Insert into enhanced users table
      await db.insert(users).values(enhancedUser);
      console.log(`Migrated user: ${enhancedUser.email}`);
    }
    
    console.log('User migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export { migrateSupabaseUsers };
```

## Phase 2: Portfolio System Implementation

### 2.1 Portfolio Tables Creation
```sql
-- Migration: 003_portfolio_system.sql

-- Portfolios table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_enhanced(id) ON DELETE CASCADE,
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
    
    CONSTRAINT unique_user_portfolio_name UNIQUE(user_id, name)
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
    
    CONSTRAINT unique_portfolio_symbol UNIQUE(portfolio_id, symbol)
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_portfolios_user ON portfolios(user_id);
CREATE INDEX idx_portfolios_updated ON portfolios(updated_at);
CREATE INDEX idx_holdings_portfolio ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_holdings_symbol ON portfolio_holdings(symbol);
CREATE INDEX idx_holdings_updated ON portfolio_holdings(updated_at);
CREATE INDEX idx_transactions_portfolio ON portfolio_transactions(portfolio_id);
CREATE INDEX idx_transactions_symbol ON portfolio_transactions(symbol);
CREATE INDEX idx_transactions_date ON portfolio_transactions(transaction_date);
CREATE INDEX idx_transactions_type ON portfolio_transactions(transaction_type);
```

### 2.2 Existing Data Migration
```sql
-- Migration: 004_migrate_existing_watchlists.sql

-- Migrate existing watchlist data to new user structure
-- Assuming we have existing watchlists that reference user_id as text
UPDATE watchlists 
SET user_id = (
    SELECT id::text 
    FROM users_enhanced 
    WHERE users_enhanced.supabase_id::text = watchlists.user_id
)
WHERE EXISTS (
    SELECT 1 
    FROM users_enhanced 
    WHERE users_enhanced.supabase_id::text = watchlists.user_id
);

-- Create default portfolios for existing users
INSERT INTO portfolios (user_id, name, description, is_default, currency)
SELECT 
    id,
    'My Portfolio',
    'Default portfolio created during migration',
    true,
    'USD'
FROM users_enhanced
WHERE NOT EXISTS (
    SELECT 1 FROM portfolios WHERE portfolios.user_id = users_enhanced.id
);
```

## Phase 3: Enhanced Analytics & Financial Data

### 3.1 Stock Fundamentals Enhancement
```sql
-- Migration: 005_enhanced_stock_data.sql

-- Enhanced stocks table (keeping original for compatibility)
CREATE TABLE enhanced_stocks AS SELECT * FROM stocks;

-- Add new columns to enhanced_stocks
ALTER TABLE enhanced_stocks 
ADD COLUMN sector_id INTEGER,
ADD COLUMN industry_id INTEGER,
ADD COLUMN country VARCHAR(2),
ADD COLUMN exchange VARCHAR(10),
ADD COLUMN currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN market_cap_tier market_cap_tier_enum,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN dividend_yield DECIMAL(5,4),
ADD COLUMN beta DECIMAL(10,4);

-- Stock fundamentals table
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
    
    CONSTRAINT unique_symbol_year_quarter UNIQUE(symbol, fiscal_year, fiscal_quarter)
);

-- Enhanced watchlists
CREATE TABLE enhanced_watchlists AS SELECT * FROM watchlists;

ALTER TABLE enhanced_watchlists
ADD COLUMN description TEXT,
ADD COLUMN is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN category VARCHAR(50),
ADD COLUMN sort_order INTEGER DEFAULT 0,
ADD COLUMN color VARCHAR(7),
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Watchlist performance tracking
CREATE TABLE watchlist_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id INTEGER NOT NULL REFERENCES enhanced_watchlists(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Performance metrics
    total_return_percent DECIMAL(10,4),
    day_change_percent DECIMAL(10,4),
    best_performer_symbol VARCHAR(10),
    worst_performer_symbol VARCHAR(10),
    avg_pe_ratio DECIMAL(10,4),
    avg_market_cap_millions BIGINT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_watchlist_date UNIQUE(watchlist_id, date)
);

-- Indexes
CREATE INDEX idx_enhanced_stocks_symbol ON enhanced_stocks(symbol);
CREATE INDEX idx_enhanced_stocks_sector ON enhanced_stocks(sector_id);
CREATE INDEX idx_enhanced_stocks_exchange ON enhanced_stocks(exchange);
CREATE INDEX idx_fundamentals_symbol ON stock_fundamentals(symbol);
CREATE INDEX idx_fundamentals_year ON stock_fundamentals(fiscal_year);
CREATE INDEX idx_watchlist_perf_date ON watchlist_performance(date);
```

## Phase 4: Audit Trail & Compliance

### 4.1 Audit Logging System
```sql
-- Migration: 006_audit_compliance_system.sql

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User context
    user_id UUID REFERENCES users_enhanced(id),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data access logs
CREATE TABLE data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_enhanced(id),
    
    -- Access details
    data_type VARCHAR(50) NOT NULL,
    data_identifier VARCHAR(255),
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
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User consents
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_enhanced(id) ON DELETE CASCADE,
    
    -- Consent details
    consent_type VARCHAR(50) NOT NULL,
    consent_version VARCHAR(20) NOT NULL,
    granted BOOLEAN NOT NULL,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    method VARCHAR(50),
    
    -- Timestamps
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit tables
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_session ON audit_logs(session_id);

CREATE INDEX idx_data_access_user ON data_access_logs(user_id);
CREATE INDEX idx_data_access_type ON data_access_logs(data_type);
CREATE INDEX idx_data_access_created ON data_access_logs(created_at);

CREATE INDEX idx_consent_user ON user_consents(user_id);
CREATE INDEX idx_consent_type ON user_consents(consent_type);
CREATE INDEX idx_consent_granted ON user_consents(granted_at);
```

## Phase 5: Performance & Caching

### 5.1 Caching Infrastructure
```sql
-- Migration: 007_caching_performance.sql

-- Cache entries table
CREATE TABLE cache_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    
    -- Cache metadata
    cache_type VARCHAR(50) NOT NULL,
    ttl_seconds INTEGER NOT NULL,
    tags VARCHAR(255)[],
    
    -- Performance tracking
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- API usage logs
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_enhanced(id),
    
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
    rate_limit_window VARCHAR(20),
    rate_limit_remaining INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_start TIMESTAMP
);

-- Indexes for caching tables
CREATE INDEX idx_cache_key ON cache_entries(cache_key);
CREATE INDEX idx_cache_type ON cache_entries(cache_type);
CREATE INDEX idx_cache_expires ON cache_entries(expires_at);
CREATE INDEX idx_cache_tags ON cache_entries USING GIN(tags);

CREATE INDEX idx_usage_user ON api_usage_logs(user_id);
CREATE INDEX idx_usage_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_usage_window ON api_usage_logs(window_start);
CREATE INDEX idx_usage_created ON api_usage_logs(created_at);
```

## Migration Execution Strategy

### 1. Pre-Migration Checklist
```bash
#!/bin/bash
# pre-migration-checklist.sh

echo "Pre-Migration Checklist for Alfalyzer Database Enhancement"
echo "========================================================"

# 1. Backup existing data
echo "1. Creating database backup..."
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test connection to target database
echo "2. Testing database connection..."
psql $DATABASE_URL -c "SELECT version();"

# 3. Verify Supabase API access
echo "3. Testing Supabase API access..."
curl -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/auth/v1/admin/users?page=1&per_page=1"

# 4. Check disk space
echo "4. Checking available disk space..."
df -h

# 5. Verify environment variables
echo "5. Verifying environment variables..."
env | grep -E "(DATABASE_URL|SUPABASE_|STRIPE_|WHOP_)"

echo "Pre-migration checklist complete!"
```

### 2. Migration Execution
```javascript
// migrate.js - Main migration orchestrator
import { migrateSupabaseUsers } from './migration-scripts/001_migrate_supabase_users.js';
import { createDefaultPortfolios } from './migration-scripts/002_create_default_portfolios.js';
import { migrateWatchlists } from './migration-scripts/003_migrate_watchlists.js';
import { setupAuditTriggers } from './migration-scripts/004_setup_audit_triggers.js';

async function runMigrations() {
  const migrations = [
    { name: 'Phase 1: User Management', fn: migrateSupabaseUsers },
    { name: 'Phase 2: Default Portfolios', fn: createDefaultPortfolios },
    { name: 'Phase 3: Watchlist Migration', fn: migrateWatchlists },
    { name: 'Phase 4: Audit Setup', fn: setupAuditTriggers },
  ];

  for (const migration of migrations) {
    try {
      console.log(`Starting: ${migration.name}`);
      await migration.fn();
      console.log(`Completed: ${migration.name}`);
    } catch (error) {
      console.error(`Failed: ${migration.name}`, error);
      throw error;
    }
  }

  console.log('All migrations completed successfully!');
}

// Run migrations
runMigrations().catch(console.error);
```

### 3. Post-Migration Validation
```sql
-- post-migration-validation.sql

-- Validate user migration
SELECT 
    'User Migration' as validation_type,
    COUNT(*) as migrated_count,
    COUNT(CASE WHEN supabase_id IS NOT NULL THEN 1 END) as with_supabase_mapping
FROM users_enhanced;

-- Validate subscription setup
SELECT 
    'Subscription Plans' as validation_type,
    COUNT(*) as plan_count,
    COUNT(CASE WHEN is_active THEN 1 END) as active_plans
FROM subscription_plans;

-- Validate portfolio creation
SELECT 
    'Default Portfolios' as validation_type,
    COUNT(*) as portfolio_count,
    COUNT(CASE WHEN is_default THEN 1 END) as default_portfolios
FROM portfolios;

-- Validate watchlist migration
SELECT 
    'Watchlist Migration' as validation_type,
    COUNT(*) as migrated_watchlists
FROM enhanced_watchlists;

-- Validate audit system
SELECT 
    'Audit System' as validation_type,
    CASE WHEN COUNT(*) > 0 THEN 'Active' ELSE 'Inactive' END as status
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### 4. Rollback Strategy
```sql
-- rollback.sql - Emergency rollback procedures

-- Step 1: Disable new features
UPDATE users_enhanced SET subscription_tier = 'free' WHERE subscription_tier != 'free';

-- Step 2: Restore from backup if needed
-- psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

-- Step 3: Switch back to original tables
-- DROP TABLE users_enhanced;
-- ALTER TABLE users_backup RENAME TO users;

-- Step 4: Clean up new tables
-- DROP TABLE portfolios CASCADE;
-- DROP TABLE portfolio_holdings CASCADE;
-- DROP TABLE portfolio_transactions CASCADE;
-- DROP TABLE audit_logs CASCADE;
```

This comprehensive migration strategy ensures a smooth transition from the current simple database setup to a robust, scalable financial application database while maintaining data integrity and minimizing downtime.