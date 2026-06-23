import express from 'express';
import { authenticate } from '../middleware/auth.js';
import facilityController from '../3-controllers/facilityController.js';

const router = express.Router();

// Get all facilities
router.get('/', authenticate, (req, res, next) => facilityController.getAll(req, res, next));

// Get facility by ID
router.get('/:id', authenticate, (req, res, next) => facilityController.getById(req, res, next));

// Create facility
router.post('/', authenticate, (req, res, next) => facilityController.create(req, res, next));

// Update facility
router.put('/:id', authenticate, (req, res, next) => facilityController.update(req, res, next));

// Delete facility
router.delete('/:id', authenticate, (req, res, next) => facilityController.delete(req, res, next));

export default router;
