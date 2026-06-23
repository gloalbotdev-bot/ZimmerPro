import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { canAccessBooking, checkRole } from '../middleware/authorization.js';
import bookingController from '../3-controllers/bookingController.js';

const router = express.Router();

// Get all bookings (owners see only their units' bookings, clients see only their own)
router.get('/', authenticate, (req, res, next) => bookingController.getAll(req, res, next));

// Get booking by ID
router.get('/:id', authenticate, canAccessBooking, (req, res, next) => bookingController.getById(req, res, next));

// Create booking (clients can book, owners can create for their units)
router.post('/', authenticate, (req, res, next) => bookingController.create(req, res, next));

// Update booking (owners update their own bookings, clients can update their own)
router.put('/:id', authenticate, canAccessBooking, (req, res, next) => bookingController.update(req, res, next));

// Delete booking (owners delete their bookings, clients delete their own, admins delete any)
router.delete('/:id', authenticate, canAccessBooking, (req, res, next) => bookingController.delete(req, res, next));

export default router;
