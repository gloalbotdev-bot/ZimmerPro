import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAuthMethod } from '../middleware/authMethodGuard.js';
import authController from '../3-controllers/authController.js';

const router = express.Router();


router.use((req, res, next) => {
  console.log(`🔐 Auth route hit: ${req.method} ${req.path} | Original URL: ${req.originalUrl}`);
  next();
});


router.post('/register', requireAuthMethod('email'), (req, res, next) => {
  console.log('📝 Register request received');
  authController.register(req, res, next);
});

// Login
router.post('/login', requireAuthMethod('email'), (req, res, next) => {
  console.log('📥 Login request received for:', req.body?.email || 'no email');
  authController.login(req, res, next);
});

// Get current user
router.get('/me', authenticate, (req, res) => authController.getMe(req, res));

// Google OAuth login
router.post('/google', requireAuthMethod('google'), (req, res, next) => {
  console.log('🔵 [Router] Google login request received');
  console.log('🔵 [Router] Request body:', JSON.stringify(req.body));
  console.log('🔵 [Router] Mode:', req.body?.mode || 'not provided');
  console.log('🔵 [Router] Token:', req.body?.token ? 'provided' : 'missing');
  authController.googleLogin(req, res, next);
});

// Phone authentication
router.post('/phone/send-otp', requireAuthMethod('phone'), (req, res, next) => {
  console.log('📱 [Router] Phone OTP request received');
  console.log('📱 [Router] Request body:', JSON.stringify(req.body));
  console.log('📱 [Router] PhoneNumber/IDNumber:', req.body?.phoneNumber || 'not provided');
  console.log('📱 [Router] Mode:', req.body?.mode || 'not provided');
  console.log('📱 [Router] Headers:', JSON.stringify(req.headers));
  authController.sendPhoneOTP(req, res, next);
});

router.post('/phone/verify-otp', requireAuthMethod('phone'), async (req, res, next) => {
  try {
    console.log('✅ Phone OTP verification request received for:', req.body?.phoneNumber || 'no phone');
    await authController.verifyPhoneOTP(req, res, next);
  } catch (error) {
    // Fallback error handler if controller doesn't catch it
    console.error('❌ [Router] verifyPhoneOTP unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error during OTP verification'
    });
  }
});

// Email authentication
router.post('/email/send-otp', requireAuthMethod('email'), (req, res, next) => {
  console.log('📧 [Router] Email OTP request received');
  console.log('📧 [Router] Request body:', JSON.stringify(req.body));
  console.log('📧 [Router] IDNumber/Email:', req.body?.idNumberOrEmail || 'not provided');
  console.log('📧 [Router] Mode:', req.body?.mode || 'not provided');
  authController.sendEmailOTP(req, res, next);
});

router.post('/email/verify-otp', requireAuthMethod('email'), async (req, res, next) => {
  try {
    console.log('✅ Email OTP verification request received for:', req.body?.idNumberOrEmail || 'no email');
    await authController.verifyEmailOTP(req, res, next);
  } catch (error) {
    // Fallback error handler if controller doesn't catch it
    console.error('❌ [Router] verifyEmailOTP unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error during email OTP verification'
    });
  }
});

// Google Calendar OAuth callback (public endpoint - no auth required initially)
router.get('/google/callback', (req, res, next) => {
  console.log('📅 Google Calendar OAuth callback received');
  authController.googleCalendarCallback(req, res, next);
});

export default router;
