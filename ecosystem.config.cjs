/**
 * PM2 process config for VPS deployments — XpressPro FX API Server
 */

module.exports = {
  apps: [{
    name: 'xpresspro-api',
    script: 'node artifacts/api-server/dist/index.mjs',
    interpreter: 'none',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '512M',
    restart_delay: 5000,
    max_restarts: 10
  }]
};
