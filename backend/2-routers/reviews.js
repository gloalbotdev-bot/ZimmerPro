import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/authorization.js';
import reviewController from '../3-controllers/reviewController.js';

const router = express.Router();

router.get('/eligible-units', authenticate, checkRole('client', 'customer'), (req, res, next) =>
  reviewController.getEligibleUnits(req, res, next)
);

router.get('/notifications', authenticate, (req, res, next) =>
  reviewController.getNotifications(req, res, next)
);

router.post('/notifications/read-all', authenticate, (req, res, next) =>
  reviewController.markAllNotificationsRead(req, res, next)
);

router.post('/notifications/:id/read', authenticate, (req, res, next) =>
  reviewController.markNotificationRead(req, res, next)
);

router.get('/', authenticate, (req, res, next) => reviewController.getAll(req, res, next));

router.get('/:id', authenticate, (req, res, next) => reviewController.getById(req, res, next));

router.post('/', authenticate, checkRole('client', 'customer'), (req, res, next) =>
  reviewController.create(req, res, next)
);

router.post('/:id/compromise', authenticate, checkRole('admin', 'zimmer_owner', 'complex_owner', 'manager'), (req, res, next) =>
  reviewController.sendCompromise(req, res, next)
);

router.post('/:id/respond', authenticate, checkRole('client', 'customer'), (req, res, next) =>
  reviewController.respondToCompromise(req, res, next)
);

router.put('/:id', authenticate, checkRole('admin'), (req, res, next) =>
  reviewController.update(req, res, next)
);

router.delete('/:id', authenticate, (req, res, next) => reviewController.delete(req, res, next));

export default router;
