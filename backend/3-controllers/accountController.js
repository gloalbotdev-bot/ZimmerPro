import accountService from '../4-services/accountService.js';

export class AccountController {
  async getAll(req, res, next) {
    try {
      console.log('🏢 [AccountController] getAll called');
      console.log('🏢 [AccountController] User:', {
        id: req.user?._id,
        role: req.user?.role,
        accountId: req.user?.accountId
      });
      
      const accounts = await accountService.getAllAccounts(req.user);
      console.log('🏢 [AccountController] Service returned', accounts?.length || 0, 'accounts');
      console.log('🏢 [AccountController] Accounts data:', JSON.stringify(accounts, null, 2));
      
      res.json({
        success: true,
        data: accounts
      });
    } catch (error) {
      console.error('❌ [AccountController] Error in getAll:', error);
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const account = await accountService.getAccountById(req.params.id, req.user);
      res.json({
        success: true,
        data: account
      });
    } catch (error) {
      if (error.message === 'Account not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      console.log('📝 [AccountController] create called with body:', req.body);
      console.log('📝 [AccountController] User:', req.user?.role);
      
      // Remove token and accountNumber from request body before processing
      const cleanBody = { ...req.body };
      delete cleanBody.token;
      delete cleanBody.accountNumber;
      console.log('📝 [AccountController] Cleaned body (removed token and accountNumber):', cleanBody);
      
      const account = await accountService.createAccount(cleanBody, req.user);
      res.status(201).json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('📝 [AccountController] Error in create:', error);
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const account = await accountService.updateAccount(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: account
      });
    } catch (error) {
      if (error.message === 'Account not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      console.log('🗑️ [AccountController] delete called with id:', req.params.id, 'type:', typeof req.params.id);
      const result = await accountService.deleteAccount(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('🗑️ [AccountController] Error in delete:', error);
      if (error.message === 'Account not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }
}

export default new AccountController();
