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

## Development
```bash
npm install
npm run dev
```

🤖 Auto-deployed with Claude Code