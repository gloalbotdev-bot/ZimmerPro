import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { checkRole } from '../middleware/authorization.js';
import userController from '../3-controllers/userController.js';

const router = express.Router();

// Get guest users for booking assignment (owners + admin)
router.get('/guests', authenticate, checkRole('admin', 'zimmer_owner', 'complex_owner', 'manager'), (req, res, next) =>
  userController.getGuests(req, res, next)
);

// Get all users (Admin only)
router.get('/', authenticate, authorize('admin'), (req, res, next) => userController.getAll(req, res, next));

// Get user by ID
router.get('/:id', authenticate, (req, res, next) => userController.getById(req, res, next));

// Create user (Admin only)
router.post('/', authenticate, authorize('admin'), (req, res, next) => userController.create(req, res, next));

// Update user
router.put('/:id', authenticate, (req, res, next) => userController.update(req, res, next));

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => userController.delete(req, res, next));

export default router;
