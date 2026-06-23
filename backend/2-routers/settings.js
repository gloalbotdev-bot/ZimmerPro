import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import settingsController from '../3-controllers/settingsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get statistics
router.get('/statistics', settingsController.getStatistics.bind(settingsController));

// Google Calendar
router.get('/google-calendar/auth-url', settingsController.getGoogleCalendarAuthUrl.bind(settingsController));
router.post('/google-calendar/connect', settingsController.connectGoogleCalendar.bind(settingsController));

// WhatsApp Config
router.get('/whatsapp-config', settingsController.getWhatsAppConfig.bind(settingsController));
router.put('/whatsapp-config', settingsController.updateWhatsAppConfig.bind(settingsController));

// Reset data (Admin only)
router.delete('/reset-data', authorize('admin'), settingsController.resetData.bind(settingsController));

export default router;
