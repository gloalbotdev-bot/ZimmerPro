// PM2 Ecosystem Configuration
// קובץ זה משמש להפעלת Node.js Backend עם PM2
// הרצה: pm2 start ecosystem.config.js

module.exports = {
    apps: [
        {
            name: 'zimmerpro-api',
            script: './1-server-express.js',
            cwd: '/var/www/zimmerspro/backend',
            
            // Environment variables
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                FRONTEND_URL: 'https://zimmerspro.message.co.il'
            },
            
            // PM2 Settings
            instances: 1,  // או 'max' ל-cluster mode
            exec_mode: 'fork',
            
            // Auto-restart
            watch: false,
            autorestart: true,
            max_memory_restart: '500M',
            
            // Logging
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            
            // Advanced
            min_uptime: '10s',
            max_restarts: 10,
            
            // Graceful shutdown
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000
        }
    ]
};
