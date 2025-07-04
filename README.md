# Alpha Analyzer - Stock Analysis Webapp

🚀 **Live Demo**: Will be available after setup

## Features
- Portuguese landing page with modern design
- Real-time stock dashboard
- 14 comprehensive financial charts
- Intrinsic value calculations
- Responsive design with dark theme

## Auto-Deployment
This project uses automatic deployment:
- Every code change → GitHub → Vercel → Live update
- URL will be provided after first deployment

## Tech Stack
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Charts: Recharts
- Routing: Wouter
- APIs: Finnhub + Alpha Vantage

## Database Configuration

Alfalyzer uses different databases depending on the environment:

- **Development**: SQLite (local file-based database)
  - Location: `./data/alfalyzer.db`
  - Automatic setup with migrations
  - No additional configuration needed

- **Staging/Production**: Supabase (PostgreSQL)
  - Cloud-hosted PostgreSQL
  - Requires Supabase account and keys
  - Migrations in `migrations/postgres-migrations/`

### Migration Management

```bash
# SQLite (Development)
npm run migrate          # Run all pending migrations
npm run migrate:status   # Check migration status
npm run migrate:rollback # Rollback last migration

# Supabase (Production)
# Use Supabase dashboard or CLI to run migrations from migrations/postgres-migrations/
```

**Note**: Keep both SQLite and PostgreSQL migrations synchronized when making schema changes.

## Environment Configuration

Alfalyzer supports multiple environment configurations:

### 🛠️ Local Development (SQLite)
Use `.env.local` or `.env` for local development:
```bash
# Copy the development template
cp .env.example .env

# Uses SQLite database (no Supabase required)
DATABASE_URL=sqlite:./data/alfalyzer.db

# Demo API keys included for testing
ALPHA_VANTAGE_API_KEY=demo_key_included
TWELVE_DATA_API_KEY=demo_key_included
```

### 🚀 Production Deployment (Supabase)
Use `.env.prod` for production deployment:
```bash
# Copy the production template
cp .env.prod.example .env.prod

# Fill with real production values:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_key
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
```

### 📋 Environment Files Reference
- `.env.example` - Development template (SQLite + demo keys)
- `.env.prod.example` - Production template (Supabase + real keys)
- `.env.public.example` - Frontend variables template
- `.env` - Your local development config (gitignored)
- `.env.prod` - Your production config (gitignored)

## Development
```bash
npm install
npm run dev
```

For production deployment, see [docs/DEPLOY_PRODUCTION.md](docs/DEPLOY_PRODUCTION.md)

🤖 Auto-deployed with Claude Code