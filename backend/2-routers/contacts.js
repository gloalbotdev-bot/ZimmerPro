import express from 'express';
import { authenticate } from '../middleware/auth.js';
import contactController from '../3-controllers/contactController.js';

const router = express.Router();


router.get('/', authenticate, (req, res, next) => contactController.getAll(req, res, next));

router.get('/guests', authenticate, (req, res, next) => contactController.getGuests(req, res, next));

router.get('/:id', authenticate, (req, res, next) => contactController.getById(req, res, next));


router.post('/', authenticate, (req, res, next) => contactController.create(req, res, next));


router.put('/:id', authenticate, (req, res, next) => contactController.update(req, res, next));


router.delete('/:id', authenticate, (req, res, next) => contactController.delete(req, res, next));

export default router;
