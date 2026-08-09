/**
 * PM2 process config for VPS deployments — XpressPro FX API Server
 */

module.exports = {
  apps: [{
    name: 'xpresspro-api',
    script: './dist/index.mjs',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '512M',
    restart_delay: 5000,
    max_restarts: 10
  }]
};
