import { isAuthMethodEnabled } from '../config/authMethods.js';

export const requireAuthMethod = (method) => (req, res, next) => {
  if (!isAuthMethodEnabled(method)) {
    return res.status(403).json({
      success: false,
      error: 'שיטת ההתחברות אינה זמינה כרגע',
    });
  }
  next();
};
