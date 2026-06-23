import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/authorization.js';
import reviewController from '../3-controllers/reviewController.js';

const router = express.Router();

// Get all reviews (owners see their units' reviews, clients see reviews for units they booked)
router.get('/', authenticate, (req, res, next) => reviewController.getAll(req, res, next));

// Get review by ID
router.get('/:id', authenticate, (req, res, next) => reviewController.getById(req, res, next));

// Create review (clients and owners can create)
router.post('/', authenticate, (req, res, next) => reviewController.create(req, res, next));

// Update review (own reviews or admin)
router.put('/:id', authenticate, (req, res, next) => reviewController.update(req, res, next));

// Delete review (own reviews or admin)
router.delete('/:id', authenticate, (req, res, next) => reviewController.delete(req, res, next));

export default router;
