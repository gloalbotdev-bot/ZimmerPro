import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import accountController from '../3-controllers/accountController.js';

const router = express.Router();


router.get('/', authenticate, authorize('admin', 'complex_owner'), (req, res, next) => accountController.getAll(req, res, next));


router.get('/:id', authenticate, (req, res, next) => accountController.getById(req, res, next));

// Create account (Admin only)
// router.post('/', authenticate, authorize('admin'), (req, res, next) => accountController.create(req, res, next));
router.post(
    '/',
    (req, res, next) => {
      console.log('🚦 HIT /accounts route');
      next();
    },
    authenticate,
    authorize('admin'),
    (req, res, next) => {
      console.log('🚦 AFTER AUTH');
      next();
    },
    accountController.create
  );
  

router.put('/:id', authenticate, (req, res, next) => accountController.update(req, res, next));

// Delete account (Admin only)
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => accountController.delete(req, res, next));

export default router;
