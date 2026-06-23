import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { canAccessUnit, checkRole } from '../middleware/authorization.js';
import roomController from '../3-controllers/roomController.js';

const router = express.Router();

// Get all rooms (owners see only their rooms)
router.get('/', authenticate, (req, res, next) => roomController.getAll(req, res, next));

// Get room by ID
router.get('/:id', authenticate, (req, res, next) => roomController.getById(req, res, next));

// Create room (only owners and admins)
router.post('/', authenticate, checkRole('admin', 'zimmer_owner', 'complex_owner'), (req, res, next) => roomController.create(req, res, next));

// Update room (only owners and admins)
router.put('/:id', authenticate, checkRole('admin', 'zimmer_owner', 'complex_owner'), (req, res, next) => roomController.update(req, res, next));

// Delete room (only owners and admins)
router.delete('/:id', authenticate, checkRole('admin', 'zimmer_owner', 'complex_owner'), (req, res, next) => roomController.delete(req, res, next));

export default router;
