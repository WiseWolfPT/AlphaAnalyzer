# PostgreSQL Migration Guide

This guide helps you migrate the Alfalyzer platform from SQLite development setup to PostgreSQL production.

## Overview

The migration involves:
- Switching from SQLite to PostgreSQL
- Using the enhanced schema with comprehensive features
- Setting up proper environment variables
- Running database migrations

## Prerequisites

1. **PostgreSQL Database**: Set up a PostgreSQL database using one of these options:
   - **Neon** (Recommended): https://neon.tech
   - **Supabase**: https://supabase.com
   - Local PostgreSQL installation
   - Other cloud providers (AWS RDS, Google Cloud SQL, etc.)

2. **Environment Setup**: Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

## Migration Steps

### 1. Database Setup

#### Option A: Neon (Recommended)
1. Create account at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Add to `.env`:
   ```
   DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"
   ```

#### Option B: Supabase
1. Create project at https://supabase.com
2. Go to Settings > Database
3. Copy connection string
4. Add to `.env`:
   ```
   DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
   ```

#### Option C: Local PostgreSQL
1. Install PostgreSQL locally
2. Create database:
   ```sql
   CREATE DATABASE alfalyzer;
   CREATE USER alfalyzer_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE alfalyzer TO alfalyzer_user;
   ```
3. Add to `.env`:
   ```
   DATABASE_URL="postgresql://alfalyzer_user:your_password@localhost:5432/alfalyzer"
   ```

### 2. Schema Migration

The enhanced schema includes:
- User management with subscription tiers
- Portfolio and holdings tracking
- Enhanced stock data with fundamentals
- Audit trails and compliance
- Caching and performance optimization

#### Generate Migration Files
```bash
npm run db:generate
```

#### Apply Migrations
```bash
npm run db:migrate
```

#### OR Push Schema Directly (Development)
```bash
npm run db:push
```

### 3. Data Migration (if needed)

If you have existing SQLite data to migrate:

1. **Export SQLite Data**:
   ```bash
   sqlite3 dev.db .dump > sqlite_dump.sql
   ```

2. **Transform Data**: The schemas are different, so manual data transformation may be needed.

3. **Import to PostgreSQL**: Use appropriate INSERT statements for the new schema.

### 4. Verification

1. **Check Database Structure**:
   ```bash
   npm run db:studio
   ```
   This opens Drizzle Studio to inspect your database.

2. **Test Application**:
   ```bash
   npm run dev
   ```

3. **Verify Connection**: Check console for successful PostgreSQL connection.

## Schema Features

The enhanced PostgreSQL schema includes:

### Core Tables
- `users`: Complete user management with subscription tiers
- `subscription_plans`: Flexible subscription system
- `subscription_history`: Audit trail for subscription changes

### Portfolio Management
- `portfolios`: Multi-portfolio support per user
- `portfolio_holdings`: Detailed position tracking
- `portfolio_transactions`: Complete transaction history

### Enhanced Stock Data
- `enhanced_stocks`: Extended stock information
- `stock_fundamentals`: Financial metrics and ratios
- `enhanced_watchlists`: Advanced watchlist features

### Compliance & Audit
- `audit_logs`: Comprehensive audit trail
- `data_access_logs`: Data access tracking
- `user_consents`: Privacy compliance

### Performance
- `cache_entries`: Intelligent caching system
- `api_usage_logs`: API usage tracking

## Environment Variables

Key environment variables for PostgreSQL:

```bash
# Database
DATABASE_URL="postgresql://..."
DATABASE_LOGGING=true
DATABASE_DEBUG=false

# Application
NODE_ENV="production"
PORT=3000
SESSION_SECRET="your-secure-secret"

# API Keys
ALPHA_VANTAGE_API_KEY="your-key"
FINNHUB_API_KEY="your-key"
FMP_API_KEY="your-key"

# Subscription (if using)
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_SECRET_KEY="sk_..."
```

## Troubleshooting

### Common Issues

1. **Connection Errors**:
   - Verify DATABASE_URL format
   - Check database server accessibility
   - Ensure SSL settings match provider requirements

2. **Migration Failures**:
   - Check database permissions
   - Verify schema compatibility
   - Review migration logs

3. **Performance Issues**:
   - Ensure proper indexing (included in schema)
   - Configure connection pooling
   - Monitor query performance

### Support

- Check Drizzle ORM documentation: https://orm.drizzle.team
- PostgreSQL documentation: https://www.postgresql.org/docs/
- Provider-specific guides (Neon, Supabase, etc.)

## Production Considerations

1. **Connection Pooling**: Consider using connection pooling for high-traffic applications
2. **Monitoring**: Set up database monitoring and alerting
3. **Backups**: Configure automated backups
4. **Security**: Use strong passwords and proper SSL configuration
5. **Performance**: Monitor query performance and optimize as needed

## Rollback Plan

If migration fails:
1. Restore from backup
2. Revert database connection to SQLite
3. Update environment variables
4. Restart application

Keep SQLite database as backup until migration is fully verified.