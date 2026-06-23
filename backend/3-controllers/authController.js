import authService from '../4-services/authService.js';
import settingsService from '../4-services/settingsService.js';

export class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('already exists')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      // Always return a proper error response, don't pass to next() for auth errors
      const errorMessage = error.message || 'Login failed';
      const status = errorMessage.includes('deactivated') ? 403 : 
                     errorMessage.includes('required') || errorMessage.includes('Invalid') ? 401 : 
                     500;
      
      return res.status(status).json({
        success: false,
        error: errorMessage
      });
    }
  }

  async getMe(req, res) {
    try {
      const user = await authService.getCurrentUser(req.user);
      res.json({
        success: true,
        data: {
          user
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error getting current user'
      });
    }
  }

  async googleLogin(req, res, next) {
    try {
      console.log('🔵 [Controller] Google login endpoint called');
      console.log('🔵 [Controller] Request body:', JSON.stringify(req.body));
      const { token, mode, role } = req.body;
      console.log('🔵 [Controller] Extracted values - mode:', mode, 'mode type:', typeof mode, 'role:', role, 'token exists:', !!token);
      const finalMode = mode || 'login';
      console.log('🔵 [Controller] Final mode to pass to service:', finalMode);
      console.log('🔵 [Controller] About to call authService.googleLogin with mode:', finalMode);
      const result = await authService.googleLogin(token, finalMode, role);
      console.log('🔵 [Controller] authService.googleLogin completed successfully');
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const errorMessage = error.message || 'Google login failed';
      const status = errorMessage.includes('deactivated') ? 403 : 
                     errorMessage.includes('required') || errorMessage.includes('Invalid') ? 401 : 
                     errorMessage.includes('לא קיים') || errorMessage.includes('כבר קיים') ? 404 :
                     500;
      
      return res.status(status).json({
        success: false,
        error: errorMessage
      });
    }
  }

  async sendPhoneOTP(req, res, next) {
    try {
      console.log('📱 [Controller] sendPhoneOTP called');
      console.log('📱 [Controller] Request body:', JSON.stringify(req.body));
      
      const { phoneNumber, mode, method = 'sms' } = req.body; // method: 'sms' or 'voice'
      console.log('📱 [Controller] Extracted phoneNumber/IDNumber:', phoneNumber);
      console.log('📱 [Controller] Extracted mode:', mode);
      console.log('📱 [Controller] Extracted method:', method);
      
      if (!phoneNumber) {
        console.error('❌ [Controller] phoneNumber is missing!');
        return res.status(400).json({
          success: false,
          error: 'Phone number or ID number is required'
        });
      }
      
      console.log('📱 [Controller] Calling authService.sendPhoneOTP...');
      const result = await authService.sendPhoneOTP(phoneNumber, mode, method);
      
      console.log('✅ [Controller] authService.sendPhoneOTP success:', JSON.stringify(result));
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ [Controller] sendPhoneOTP error:', error);
      console.error('❌ [Controller] Error message:', error.message);
      console.error('❌ [Controller] Error stack:', error.stack);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send OTP'
      });
    }
  }

  async verifyPhoneOTP(req, res, next) {
    try {
      const { phoneNumber, otp, ...userData } = req.body;
      console.log('🔐 [Controller] verifyPhoneOTP called');
      console.log('🔐 [Controller] phoneNumber:', phoneNumber);
      console.log('🔐 [Controller] otp:', otp ? '***' : 'missing');
      console.log('🔐 [Controller] userData:', JSON.stringify(userData));
      
      const result = await authService.verifyPhoneOTP(phoneNumber, otp, userData);
      
      console.log('✅ [Controller] verifyPhoneOTP success');
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ [Controller] verifyPhoneOTP error:', error);
      console.error('❌ [Controller] Error message:', error?.message);
      console.error('❌ [Controller] Error stack:', error?.stack);
      
      const errorMessage = error?.message || 'OTP verification failed';
      const status = errorMessage.includes('expired') || errorMessage.includes('Invalid') ? 400 :
                     errorMessage.includes('deactivated') ? 403 : 
                     401;
      
      // Always return response, never call next()
      return res.status(status).json({
        success: false,
        error: errorMessage
      });
    }
  }

  async sendEmailOTP(req, res, next) {
    try {
      console.log('📧 [Controller] sendEmailOTP called');
      console.log('📧 [Controller] Request body:', JSON.stringify(req.body));
      
      const { idNumberOrEmail, mode = 'login' } = req.body;
      console.log('📧 [Controller] Extracted idNumberOrEmail:', idNumberOrEmail);
      console.log('📧 [Controller] Extracted mode:', mode);
      
      if (!idNumberOrEmail) {
        console.error('❌ [Controller] idNumberOrEmail is missing!');
        return res.status(400).json({
          success: false,
          error: 'ID number or email is required'
        });
      }
      
      console.log('📧 [Controller] Calling authService.sendEmailOTP...');
      const result = await authService.sendEmailOTP(idNumberOrEmail, mode);
      
      console.log('✅ [Controller] authService.sendEmailOTP success:', JSON.stringify(result));
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ [Controller] sendEmailOTP error:', error);
      console.error('❌ [Controller] Error message:', error.message);
      console.error('❌ [Controller] Error stack:', error.stack);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send email OTP'
      });
    }
  }

  async verifyEmailOTP(req, res, next) {
    try {
      const { idNumberOrEmail, otp, ...userData } = req.body;
      console.log('🔐 [Controller] verifyEmailOTP called');
      console.log('🔐 [Controller] idNumberOrEmail:', idNumberOrEmail);
      console.log('🔐 [Controller] otp:', otp ? '***' : 'missing');
      console.log('🔐 [Controller] userData:', JSON.stringify(userData));
      
      const result = await authService.verifyEmailOTP(idNumberOrEmail, otp, userData);
      
      console.log('✅ [Controller] verifyEmailOTP success');
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ [Controller] verifyEmailOTP error:', error);
      console.error('❌ [Controller] Error message:', error?.message);
      console.error('❌ [Controller] Error stack:', error?.stack);
      
      const errorMessage = error?.message || 'Email OTP verification failed';
      const status = errorMessage.includes('expired') || errorMessage.includes('Invalid') ? 400 :
                     errorMessage.includes('deactivated') ? 403 : 
                     401;
      
      // Always return response, never call next()
      return res.status(status).json({
        success: false,
        error: errorMessage
      });
    }
  }

  async googleCalendarCallback(req, res, next) {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Authorization code is required'
        });
      }

      if (!state) {
        return res.status(400).json({
          success: false,
          error: 'State (user ID) is required'
        });
      }

      const userId = state.toString();
      console.log('📅 [AuthController] Google Calendar callback - userId:', userId);
      
      const user = await settingsService.connectGoogleCalendarWithCode(userId, code);
      
      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/settings?googleCalendarConnected=true`);
    } catch (error) {
      console.error('❌ [AuthController] Google Calendar callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/settings?googleCalendarError=${encodeURIComponent(error.message || 'Failed to connect')}`);
    }
  }
}

export default new AuthController();
