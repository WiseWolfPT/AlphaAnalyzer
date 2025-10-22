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
    }
  ]
};
