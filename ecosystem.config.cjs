module.exports = {
  apps: [
    {
      name: 'alfalyzer',
      script: 'dist/server/index.cjs',
      interpreter: 'node',
      cwd: '/home/teste 1',
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist/public', '.env*'],
      max_memory_restart: '1G',
      env_file: './.env.production',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SERVE_STATIC: 'true'
      }
    },
    {
      name: 'price-worker',
      // Phase B: run compiled CJS worker
      script: 'dist/server/workers/price-worker.cjs',
      interpreter: 'node',
      cwd: '/home/teste 1',
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/worker-err.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist/public', '.env*'],
      max_memory_restart: '500M',
      env_file: './.env.production',
      env: {
        NODE_ENV: 'production',
        WORKER_HEALTH_PORT: 3002
      },
      cron_restart: '0 */6 * * *' // Restart every 6 hours to clear any memory leaks
    },
    {
      name: 'transcripts-worker',
      // Phase B: run compiled CJS worker
      script: 'dist/server/workers/transcripts-worker.cjs',
      interpreter: 'node',
      cwd: '/home/teste 1',
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/transcripts-err.log',
      out_file: './logs/transcripts-out.log',
      log_file: './logs/transcripts-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist/public', '.env*'],
      max_memory_restart: '500M',
      env_file: './.env.production',
      env: {
        NODE_ENV: 'production',
        WORKER_INTERVAL_MINUTES: '30',
        WORKER_HEALTH_PORT: 3003
        // OPENAI_API_KEY loaded via dotenv from .env.production (single source of truth)
      }
    },
    {
      name: 'valuation-updater',
      // FASE 2: AlfaValue™ scheduled maintenance worker
      script: 'dist/server/workers/valuation-updater.cjs',
      interpreter: 'node',
      cwd: '/home/teste 1',
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/valuation-err.log',
      out_file: './logs/valuation-out.log',
      log_file: './logs/valuation-combined.log',
      time: true,
      autorestart: false, // Don't auto-restart on exit (cron-based)
      max_restarts: 3,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist/public', '.env*'],
      max_memory_restart: '500M',
      env_file: './.env.production',
      env: {
        NODE_ENV: 'production',
        WORKER_HEALTH_PORT: 3004,
        // Valuation worker configuration
        HOT_SET_SIZE: '100', // Top 100 tickers for daily updates
        VALUATION_DAILY_CRON: '0 6 * * *', // 06:00 UTC daily
        VALUATION_MONTHLY_CRON: '0 7 1 * *', // 07:00 UTC on 1st of month
        VALUATION_QUARTERLY_CRON: '0 8 1 */3 *' // 08:00 UTC on 1st of quarter (Jan/Apr/Jul/Oct)
      },
      // Run daily at 06:00 UTC
      cron_restart: '0 6 * * *'
    },
    {
      name: 'earnings-monitor',
      // Event-driven earnings cache refresh worker
      script: 'dist/server/workers/earnings-monitor.cjs',
      interpreter: 'node',
      cwd: '/home/teste 1',
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/earnings-monitor-err.log',
      out_file: './logs/earnings-monitor-out.log',
      log_file: './logs/earnings-monitor-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist/public', '.env*'],
      max_memory_restart: '200M',
      env_file: './.env.production',
      env: {
        NODE_ENV: 'production',
        WORKER_HEALTH_PORT: 3005,
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        REDIS_PASSWORD: 'alfalyzer2025redis',
        // Earnings monitor configuration
        EARNINGS_MONITOR_INTERVAL_MS: '3600000', // 1 hour (3600000ms)
        EARNINGS_LOOKBACK_HOURS: '48', // Check earnings from last 48h
        EARNINGS_LOOKAHEAD_DAYS: '2', // Check upcoming earnings (next 2 days)
        EARNINGS_MAX_CALLS_PER_CYCLE: '50' // Safety limit (circuit breaker)
      }
    },
    {
      name: 'iv-warming-worker',
      // ONDA 7: Intrinsic Value cache warming - S&P 100 hourly
      script: 'dist/server/workers/iv-warming-worker.cjs',
      interpreter: 'node',
      cwd: '/home/teste 1',
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/iv-warming-err.log',
      out_file: './logs/iv-warming-out.log',
      log_file: './logs/iv-warming-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist/public', '.env*'],
      max_memory_restart: '300M',
      env_file: './.env.production',
      env: {
        NODE_ENV: 'production',
        WORKER_HEALTH_PORT: 3007,
        WARMING_TIER: 'basic',  // Warms S&P 100 hourly
        WARMING_INTERVAL_MS: '3600000',  // 1 hour
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        REDIS_PASSWORD: 'alfalyzer2025redis'
      }
    },
    {
      name: 'intelligent-warming-worker',
      // ONDA 7: Intelligent cache warming with priority queue and bandwidth throttling
      script: 'dist/server/workers/intelligent-warming-worker.cjs',
      interpreter: 'node',
      cwd: '/home/teste 1',
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/intelligent-warming-err.log',
      out_file: './logs/intelligent-warming-out.log',
      log_file: './logs/intelligent-warming-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist/public', '.env*'],
      max_memory_restart: '300M',
      env_file: './.env.production',
      env: {
        NODE_ENV: 'production',
        WORKER_HEALTH_PORT: 3008,
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        REDIS_PASSWORD: 'alfalyzer2025redis',
        // Intelligent warming configuration
        WARMING_BATCH_SIZE: '50',          // Tasks per cycle
        WARMING_CYCLE_INTERVAL_MS: '300000', // 5 minutes
        WARMING_RATE_LIMIT_MS: '250',      // 4 calls/sec (250ms delay)
        // Bandwidth limits (FMP)
        FMP_MONTHLY_LIMIT_GB: '20',
        FMP_DAILY_BUDGET_MB: '666',         // ~20GB / 30 days
        FMP_API_KEY: 'sEoOHoj4kGtqhkU7MrQl4lmeF4LwB2Bh',
        // PostgreSQL configuration
        PGHOST: '127.0.0.1',
        PGPORT: '5432',
        PGUSER: 'alfalyzer',
        PGPASSWORD: process.env.PGPASSWORD || '',
        PGDATABASE: 'alfalyzer_db'
      }
    }
  ]
};
