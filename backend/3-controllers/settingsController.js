import settingsService from '../4-services/settingsService.js';

export class SettingsController {
  async getGoogleCalendarAuthUrl(req, res, next) {
    try {
      const userId = req.user._id.toString();
      const authUrl = await settingsService.getGoogleCalendarAuthUrl(userId);
      res.json({
        success: true,
        data: { authUrl }
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const stats = await settingsService.getStatistics(req.user);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getGoogleCalendarAuthUrl(req, res, next) {
    try {
      const userId = req.user._id.toString();
      const authUrl = await settingsService.getGoogleCalendarAuthUrl(userId);
      res.json({
        success: true,
        data: { authUrl }
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async connectGoogleCalendar(req, res, next) {
    try {
      const userId = req.user._id.toString();
      // If code is provided, exchange it for tokens
      if (req.body.code) {
        const user = await settingsService.connectGoogleCalendarWithCode(userId, req.body.code);
        res.json({
          success: true,
          data: { user }
        });
      } else {
        // Otherwise, return auth URL
        const result = await settingsService.connectGoogleCalendar(userId);
        res.json({
          success: true,
          data: result
        });
      }
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async updateWhatsAppConfig(req, res, next) {
    try {
      const accountId = req.user.accountId || req.body.accountId;
      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: 'Account ID is required'
        });
      }

      const config = await settingsService.updateWhatsAppConfig(accountId, req.body);
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async getWhatsAppConfig(req, res, next) {
    try {
      const accountId = req.user.accountId || req.params.accountId;
      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: 'Account ID is required'
        });
      }

      const config = await settingsService.getWhatsAppConfig(accountId);
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async resetData(req, res, next) {
    try {
      // Only admin can reset data
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin only.'
        });
      }

      const result = await settingsService.resetData();
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SettingsController();
