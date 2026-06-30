import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './5-repositories/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Routes
import authRoutes from './2-routers/auth.js';
import userRoutes from './2-routers/users.js';
import unitRoutes from './2-routers/units.js';
import bookingRoutes from './2-routers/bookings.js';
import accountRoutes from './2-routers/accounts.js';
import contactRoutes from './2-routers/contacts.js';
import facilityRoutes from './2-routers/facilities.js';
import reviewRoutes from './2-routers/reviews.js';
import roomRoutes from './2-routers/rooms.js';
import settingsRoutes from './2-routers/settings.js';
import uploadRoutes from './2-routers/upload.js';
import botRoutes from './2-routers/bot.js';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

console.log('🔥 SERVER STARTED AT', new Date().toISOString());


if (result.error) {
  console.warn('⚠️  Warning: .env file not found or could not be loaded');
  console.warn('   Using default values or environment variables');
} else {
  console.log('✅ Environment variables loaded from .env');
}

const app = express();
const PORT = process.env.PORT || 3000;

connectDB().catch((error) => {
  console.error('⚠️  Failed to connect to MongoDB:', error.message);
  console.warn('⚠️  Server will continue to run, but database operations will fail');
  console.warn('');
  console.warn('📋 Next steps to fix:');
  console.warn('   1. Go to: https://cloud.mongodb.com');
  console.warn('   2. Select your cluster');
  console.warn('   3. Click "Network Access"');
  console.warn('   4. Click "Add IP Address"');
  console.warn('   5. Enter: 0.0.0.0/0 (to allow all IPs)');
  console.warn('   6. Wait 2-3 minutes until status is "Active"');
  console.warn('   7. Restart this server (Ctrl+C then npm start)');
  console.warn('');
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    
    const localOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'https://zimmerspro.message.co.il',
      process.env.FRONTEND_URL
    ].filter(Boolean);


    
    
    const isLocalDev = /^http:\/\/\d+\.\d+\.\d+\.\d+:517[34]$/.test(origin) ||
                      localOrigins.includes(origin) ||
                      origin.includes('localhost') ||
                      origin.includes('127.0.0.1');
    
    if (isLocalDev) {
      console.log(`✅ CORS allowing origin: ${origin}`);
      return callback(null, true);
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      if (localOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      console.log(`✅ CORS allowing origin (dev): ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// `api.ts` sends most POST/PUT bodies as `?payload=<encodeURIComponent(JSON)>` with an empty fetch body.
// Merge that into req.body so controllers keep using req.body as before.
app.use((req, res, next) => {
  const raw = req.query.payload;
  if (raw == null || raw === '') {
    return next();
  }
  try {
    const str = typeof raw === 'string' ? raw : String(raw);
    let parsed;
    try {
      parsed = JSON.parse(str);
    } catch {
      parsed = JSON.parse(decodeURIComponent(str));
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      req.body = { ...parsed, ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    }
  } catch (e) {
    console.warn('⚠️  [Server] Could not parse query payload:', e.message);
  }
  next();
});

// Serve uploaded files
// In production: use /var/www/zimmerspro/backend/uploads
// In development: use backend/uploads
const isProduction = process.env.NODE_ENV === 'production';
const uploadsDir = join(__dirname, 'uploads');  // /var/www/zimmerspro/backend/uploads (same for both)
console.log(`📁 [Server] Uploads directory: ${uploadsDir}`);
console.log(`📁 [Server] Production mode: ${isProduction}`);
if (!existsSync(uploadsDir)) {
  mkdir(uploadsDir, { recursive: true }).then(() => {
    console.log(`  📁 Created uploads directory: ${uploadsDir}`);
  }).catch(err => {
    console.error(`  ❌ Failed to create uploads directory: ${err.message}`);
  });
}
// Add logging middleware for uploads
app.use('/uploads', (req, res, next) => {
  console.log(`📥 [Static] Request for: ${req.path}`);
  console.log(`📥 [Static] Full URL: ${req.originalUrl}`);
  console.log(`📥 [Static] Method: ${req.method}`);
  next();
});

app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    console.log(`📤 [Static] Serving file: ${path}`);
    // Set proper content type for images
    if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    // Enable CORS for uploaded files
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
  fallthrough: false // Don't fall through to next middleware if file not found
}));

// Handle 404 for uploads
app.use('/uploads', (req, res) => {
  console.error(`❌ [Static] File not found: ${req.path}`);
  res.status(404).json({ error: 'File not found', path: req.path });
});

console.log(`  ✅ Static files served from /uploads (${uploadsDir})`);

app.get('/api', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ZimmerPro API is running',
    timestamp: new Date().toISOString()
  });
});

console.log('📋 Loading API routes...');

app.use((req, res, next) => {
  console.log(`📥 Incoming: ${req.method} ${req.originalUrl} (path: ${req.path})`);
  next();
});

// Register auth routes
app.use('/api/auth', authRoutes);
console.log('  ✅ /api/auth routes loaded');
console.log('  ✅ Available routes:');
console.log('     - POST /api/auth/register');
console.log('     - POST /api/auth/login');
console.log('     - POST /api/auth/google');
console.log('     - GET  /api/auth/me');
console.log('     - POST /api/auth/phone/send-otp');
console.log('     - POST /api/auth/phone/verify-otp');
console.log('     - POST /api/auth/email/send-otp');
console.log('     - POST /api/auth/email/verify-otp');

app.use('/api/users', userRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/bot', botRoutes);
console.log('  ✅ /api/upload routes loaded');
console.log('  ✅ /api/bot routes loaded (actions JSON format)');
console.log('✅ All API routes loaded successfully');

app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('='.repeat(60));
  console.log(`🚀 ZimmerPro Backend Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`📡 Login endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Server listening on: 0.0.0.0:${PORT} (accessible from Windows)`);
  console.log('='.repeat(60));
  console.log('');
});

server.on('listening', () => {
  const address = server.address();
  console.log(`✅ Server is listening on ${address.address}:${address.port}`);

  // Auto-publish expired reviews every 15 minutes
  import('./4-services/reviewService.js').then(({ default: reviewService }) => {
    const runAutoPublish = () => {
      reviewService.autoPublishExpired().catch(err => {
        console.error('❌ [Reviews] autoPublishExpired error:', err.message);
      });
    };
    runAutoPublish();
    setInterval(runAutoPublish, 15 * 60 * 1000);
    console.log('✅ Review auto-publish job scheduled (every 15 min)');
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error(`   Please stop the other process or change PORT in .env`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
