// דוגמה ל-Node.js/Express Backend Server
// קובץ זה מדגים איך ליצור Backend שיתחבר ל-Nginx

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://zimmerspro.message.co.il',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Example: WhatsApp Webhook Endpoint
app.post('/api/webhook', async (req, res) => {
    try {
        const { entry } = req.body;
        
        // Process webhook data
        console.log('Webhook received:', JSON.stringify(entry, null, 2));
        
        // TODO: Add your webhook processing logic here
        
        res.json({ success: true, message: 'Webhook processed' });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Example: API Endpoint
app.get('/api/data', (req, res) => {
    res.json({
        message: 'This is data from the backend',
        data: {
            users: 100,
            units: 50
        }
    });
});

// Error Handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});
