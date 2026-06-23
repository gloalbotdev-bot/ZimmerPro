import express from 'express';
import botController from '../3-controllers/botController.js';
import { authenticateBot, botRequireRoles } from '../middleware/botAuth.js';

const router = express.Router();

const ownerRoles = ['admin', 'zimmer_owner', 'complex_owner', 'manager'];
const accountReaderRoles = ['admin', 'complex_owner'];

// ——— מנהל / בעלים (אחרי login — שליחת Bearer token) ———

router.post('/admin/login', (req, res) => botController.adminLogin(req, res));


router.get(
  '/admin/units',
  authenticateBot,
  botRequireRoles(...ownerRoles),
  (req,res)=>botController.adminListUnits(req,res)
);

router.post(
  '/admin/units/list',
  authenticateBot,
  botRequireRoles(...ownerRoles),
  (req,res)=>botController.adminListUnits(req,res)
);

router.post(
  '/admin/units',
  authenticateBot,
  botRequireRoles(...ownerRoles),
  (req,res)=>botController.adminCreateUnit(req,res)
);

router.get(
  '/admin/units',
  authenticateBot,
  botRequireRoles(...ownerRoles),
  (req, res) => botController.adminListUnits(req, res)
);

router.get(
  '/admin/accounts',
  authenticateBot,
  botRequireRoles(...accountReaderRoles),
  (req, res) => botController.adminListAccounts(req, res)
);

router.post(
  '/admin/units',
  authenticateBot,
  botRequireRoles(...ownerRoles),
  (req, res) => botController.adminCreateUnit(req, res)
);

router.delete(
  '/admin/units/:id',
  authenticateBot,
  botRequireRoles(...ownerRoles),
  (req, res) => botController.adminDeleteUnit(req, res)
);

router.post(
  '/admin/accounts',
  authenticateBot,
  botRequireRoles('admin', 'complex_owner'),
  (req, res) => botController.adminCreateAccount(req, res)
);

router.delete(
  '/admin/accounts/:id',
  authenticateBot,
  botRequireRoles('admin'),
  (req, res) => botController.adminDeleteAccount(req, res)
);

// ——— לקוח בוט (ללא JWT) ———

router.post('/guest/search', (req, res) => botController.guestSearch(req, res));
router.post('/guest/book', (req, res) => botController.guestBook(req, res));

// ——— callback ליד נכנס ———

router.post('/webhook/lead', (req, res) => botController.webhookLead(req, res));

export default router;
