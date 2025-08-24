module.exports = {
  apps: [
    {
      name: 'alfalyzer-dev',
      script: 'server/index.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/dev-err.log',
      out_file: './logs/dev-out.log',
      log_file: './logs/dev-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist/public', '.env*'],
      max_memory_restart: '1G',
      env_file: './.env',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      }
    },
    {
      name: 'price-worker-dev',
      script: 'server/workers/price-worker.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/worker-dev-err.log',
      out_file: './logs/worker-dev-out.log',
      log_file: './logs/worker-dev-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist/public', '.env*'],
      max_memory_restart: '500M',
      env_file: './.env',
      env: {
        NODE_ENV: 'development',
        WORKER_HEALTH_PORT: 3002
      },
      cron_restart: '0 */6 * * *' // Restart every 6 hours to clear any memory leaks
    }
  ]
};