import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { canAccessUnit, checkRole } from '../middleware/authorization.js';
import unitController from '../3-controllers/unitController.js';

const router = express.Router();

// Get all units (owners see only their units, admin sees all)
router.get('/', authenticate, (req, res, next) => unitController.getAll(req, res, next));

// Get unit by ID
router.get('/:id', authenticate, canAccessUnit, (req, res, next) => unitController.getById(req, res, next));

// Create unit (only owners and admins)
router.post('/', authenticate, checkRole('admin', 'zimmer_owner', 'complex_owner'), (req, res, next) => unitController.create(req, res, next));

// Update unit (only owners and admins)
router.put('/:id', authenticate, canAccessUnit, checkRole('admin', 'zimmer_owner', 'complex_owner'), (req, res, next) => unitController.update(req, res, next));

// Delete unit (only owners and admins)
router.delete('/:id', authenticate, canAccessUnit, checkRole('admin', 'zimmer_owner', 'complex_owner'), (req, res, next) => unitController.delete(req, res, next));

export default router;
