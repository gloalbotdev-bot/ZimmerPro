// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import { connectDB } from './src/config/database.js';
// import { errorHandler, notFound } from './src/middleware/errorHandler.js';

// // Routes
// import authRoutes from './src/routes/auth.js';
// import userRoutes from './src/routes/users.js';
// import unitRoutes from './src/routes/units.js';
// import bookingRoutes from './src/routes/bookings.js';
// import accountRoutes from './src/routes/accounts.js';
// import contactRoutes from './src/routes/contacts.js';
// import facilityRoutes from './src/routes/facilities.js';
// import reviewRoutes from './src/routes/reviews.js';
// import roomRoutes from './src/routes/rooms.js';

// // Load environment variables
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Load .env file
// const envPath = join(__dirname, '.env');
// const result = dotenv.config({ path: envPath });

// if (result.error) {
//   console.warn('⚠️  Warning: .env file not found or could not be loaded');
//   console.warn('   Using default values or environment variables');
// } else {
//   console.log('✅ Environment variables loaded from .env');
// }

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Connect to MongoDB
// connectDB();

// // Middleware
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   credentials: true
// }));

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // app.get('/api',(req,res)=>{
// //   res.json({status:'OK',message:'ZimmerPro API is running',timestamp:new Date().toISOString()})
// // });

// // Health check endpoint
// app.get('/api', (req, res) => {
//   res.json({
//     status: 'OK',
//     message: 'ZimmerPro API is running',
//     timestamp: new Date().toISOString()
//   });
// });

// // API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/units', unitRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/accounts', accountRoutes);
// app.use('/api/contacts', contactRoutes);
// app.use('/api/facilities', facilityRoutes);
// app.use('/api/reviews', reviewRoutes);
// app.use('/api/rooms', roomRoutes);

// // Error handling middleware (must be last)
// app.use(notFound);
// app.use(errorHandler);



// // Start server
// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`🚀 ZimmerPro Backend Server running on port ${PORT}`);
//   console.log(`📡 API available at http://localhost:${PORT}/api`);
//   console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   process.exit(0);
// });

// process.on('SIGINT', () => {
//   console.log('SIGINT signal received: closing HTTP server');
//   process.exit(0);
// });
