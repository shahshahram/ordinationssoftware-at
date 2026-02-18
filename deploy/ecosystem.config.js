/**
 * PM2 Ecosystem - Ordinationssoftware Backend
 * Auf Server ausführen: pm2 start ecosystem.config.js
 * Aus dem deploy/ Verzeichnis: pm2 start deploy/ecosystem.config.js
 */

module.exports = {
  apps: [{
    name: 'ordinationssoftware-backend',
    script: './server.js',
    cwd: '/home/ordinationssoftware/ordinationssoftware-at/backend',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/home/ordinationssoftware/logs/pm2-error.log',
    out_file: '/home/ordinationssoftware/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
