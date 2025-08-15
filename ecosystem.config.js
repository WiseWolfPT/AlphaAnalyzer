module.exports = {
  apps: [{
    name: 'alfalyzer',
    script: 'dist/server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      SERVE_STATIC: 'true'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      SERVE_STATIC: 'true'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist/public'],
    max_memory_restart: '1G',
    env_file: '.env'
  }]
};