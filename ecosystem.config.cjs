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
      }
    }
  ]
};
