import userRepository from '../5-repositories/userRepository.js';
import userSettingsRepository from '../5-repositories/userSettingsRepository.js';
import { generateToken } from '../utils/jwt.js';
import User from '../models/User.js';
import smsService from './smsService.js';
import emailService from './emailService.js';

// Simple in-memory OTP storage (stores OTP codes)
const otpStorage = new Map(); // phone -> { otp, expiresAt, mode, idNumber }
const emailOtpStorage = new Map(); // email -> { otp, expiresAt, mode, idNumber }

export class AuthService {
  async register(userData) {
    const { name, firstName, lastName, email, password, phoneNumber, idNumber, role, accountId } = userData;

    if (!name && !firstName) {
      throw new Error('Name or first name is required');
    }
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Check if user already exists by email
    const existingUserByEmail = await userRepository.findByEmail(email);
    if (existingUserByEmail) {
      throw new Error('User with this email already exists');
    }

    // Check if user already exists by idNumber (if provided)
    if (idNumber) {
      const existingUserById = await User.findOne({ idNumber });
      if (existingUserById) {
        throw new Error('User with this ID number already exists');
      }
    }

    // Combine firstName and lastName into name if provided separately
    const fullName = name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || '');

    // Create UserSettings first (required for every user)
    // New registrations always get 'client' role, so ownerType should be 'client' (default)
    const finalRole = role || 'client'; // Default to 'client' for new registrations
    let ownerType = 'client'; // default for client role
    if (finalRole === 'admin') {
      ownerType = 'admin';
    } else if (finalRole === 'complex_owner' || finalRole === 'manager') {
      ownerType = 'complex_owner';
    } else if (finalRole === 'zimmer_owner') {
      ownerType = 'zimmer_owner';
    }

    const userSettingsData = {
      ownerType: ownerType,
      numberOfComplexes: 0 // Default for new client registrations
    };

    const userSettings = await userSettingsRepository.create(userSettingsData);
    console.log('✅ [AuthService] UserSettings created for new registration:', userSettings.id);

    const user = await userRepository.create({
      name: fullName,
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      idNumber,
      role: finalRole,
      accountId,
      isApproved: false,
      userSettingsId: userSettings._id // Link UserSettings to User
    });

    // Notify admins about new user registration
    try {
      await this.notifyAdminsNewUserRegistration(user, 'Standard');
    } catch (notifyError) {
      console.error('Failed to notify admins about new user:', notifyError);
      // Don't fail the registration if notification fails
    }

    const token = generateToken(user._id.toString());

    return {
      user: user.toJSON(),
      token
    };
  }

  async login(email, password) {
    console.log('🔐 [AuthService] Login attempt for email:', email);
    
    if (!email || !password) {
      console.error('❌ [AuthService] Missing email or password');
      throw new Error('Email and password are required');
    }

    // Check if MongoDB is connected
    const mongoose = (await import('mongoose')).default;
    const connectionState = mongoose.connection.readyState;
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    
    if (connectionState !== 1) {
      const stateNames = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };
      console.error(`❌ MongoDB connection state: ${connectionState} (${stateNames[connectionState] || 'unknown'})`);
      console.error('💡 Please check:');
      console.error('   1. MongoDB Atlas Network Access - ensure your IP (0.0.0.0/0) is whitelisted and status is "Active"');
      console.error('   2. Restart the server after adding IP to MongoDB Atlas');
      console.error('   3. Wait 2-3 minutes after adding IP until status becomes "Active"');
      throw new Error('Database connection is not available. Please check MongoDB Atlas Network Access settings.');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      console.error('❌ [AuthService] User not found for email:', email);
      throw new Error('Invalid email or password');
    }
    
    console.log('✅ [AuthService] User found:', {
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      isApproved: user.isApproved,
      passwordLength: user.password?.length,
      passwordStartsWith: user.password?.substring(0, 10)
    });

    try {
      // Check if password is already hashed (starts with $2a$ or $2b$)
      const isPasswordHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
      console.log('🔐 [AuthService] Password check:', {
        isPasswordHashed,
        storedPasswordPreview: user.password.substring(0, 20) + '...',
        providedPasswordLength: password.length
      });
      
      if (!isPasswordHashed) {
        // Password is not hashed - verify with plain text comparison
        console.log('🔐 [AuthService] Comparing plain text passwords');
        const isPasswordValid = user.password === password;
        console.log('🔐 [AuthService] Plain text comparison result:', isPasswordValid);
        
        if (!isPasswordValid) {
          console.error('[AuthService] Plain text password mismatch for', email);
          throw new Error('Invalid email or password');
        }
        
        // Auto-fix: Hash the password and save it
        // IMPORTANT: Use updateOne to bypass pre-save hook and avoid double hashing
        console.log(`🔐 [AuthService] Auto-hashing password for user ${email}`);
        const bcrypt = (await import('bcryptjs')).default;
        const hashedPassword = await bcrypt.hash(password, 10);
        // Use updateOne to bypass pre-save hook (which would hash again)
        await User.updateOne({ _id: user._id }, { password: hashedPassword });
        console.log(`✅ [AuthService] Password hashed and saved for user ${email}`);
      } else {
        // Password is hashed - use bcrypt comparison
        console.log('🔐 [AuthService] Comparing hashed passwords with bcrypt');
        const isPasswordValid = await user.comparePassword(password);
        console.log('🔐 [AuthService] Bcrypt comparison result:', isPasswordValid);
        
        if (!isPasswordValid) {
          console.error('❌ [AuthService] Hashed password mismatch');
          throw new Error('Invalid email or password');
        }
      }
    } catch (error) {
      // If it's already an Error, re-throw it
      if (error instanceof Error) {
        console.error('❌ [AuthService] Login error:', error.message);
        throw error;
      }
      // Otherwise throw a generic error
      console.error('❌ [AuthService] Unknown login error:', error);
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      console.error('❌ [AuthService] User account is deactivated');
      throw new Error('Account is deactivated');
    }

    // Fix: Create UserSettings for existing users that don't have it
    if (!user.userSettingsId) {
      console.log(`⚠️  [AuthService] User ${email} missing userSettingsId, creating UserSettings...`);
      
      // Determine ownerType based on user's role
      let ownerType = 'client'; // default
      if (user.role === 'admin') {
        ownerType = 'admin';
      } else if (user.role === 'complex_owner' || user.role === 'manager') {
        ownerType = 'complex_owner';
      } else if (user.role === 'zimmer_owner') {
        ownerType = 'zimmer_owner';
      }

      const userSettingsData = {
        ownerType: ownerType,
        numberOfComplexes: (ownerType === 'complex_owner' || ownerType === 'admin') ? 1 : 0
      };

      const userSettings = await userSettingsRepository.create(userSettingsData);
      console.log('✅ [AuthService] UserSettings created for existing user:', userSettings.id);
      
      // Update user with userSettingsId
      user.userSettingsId = userSettings._id;
      await user.save();
      console.log('✅ [AuthService] User updated with userSettingsId');
    }

    const token = generateToken(user._id.toString());
    console.log('✅ [AuthService] Token generated successfully');

    const userJson = user.toJSON();
    
    // Load UserSettings if available
    if (user.userSettingsId) {
      try {
        const userSettings = await userSettingsRepository.findById(user.userSettingsId);
        if (userSettings) {
          userJson.userSettings = userSettings.toJSON();
        }
      } catch (error) {
        console.error('Error loading UserSettings for user:', error);
      }
    }
    
    console.log('✅ [AuthService] Login successful for user:', email);
    
    return {
      user: userJson,
      token
    };
  }

  async getCurrentUser(user) {
    // Fix: Create UserSettings for existing users that don't have it
    if (!user.userSettingsId) {
      console.log(`⚠️  [AuthService] User ${user.email} missing userSettingsId in getCurrentUser, creating UserSettings...`);
      
      try {
        // Determine ownerType based on user's role
        let ownerType = 'client'; // default
        if (user.role === 'admin') {
          ownerType = 'admin';
        } else if (user.role === 'complex_owner' || user.role === 'manager') {
          ownerType = 'complex_owner';
        } else if (user.role === 'zimmer_owner') {
          ownerType = 'zimmer_owner';
        }

        const userSettingsData = {
          ownerType: ownerType,
          numberOfComplexes: (ownerType === 'complex_owner' || ownerType === 'admin') ? 1 : 0
        };

        const userSettings = await userSettingsRepository.create(userSettingsData);
        console.log('✅ [AuthService] UserSettings created for existing user in getCurrentUser:', userSettings.id);
        
        // Update user with userSettingsId
        user.userSettingsId = userSettings._id;
        await user.save();
        console.log('✅ [AuthService] User updated with userSettingsId in getCurrentUser');
      } catch (error) {
        console.error('❌ [AuthService] Error creating UserSettings in getCurrentUser:', error);
        // Don't fail - continue without UserSettings
      }
    }

    const userJson = user.toJSON();
    
    // Load UserSettings if available
    if (user.userSettingsId) {
      try {
        const userSettings = await userSettingsRepository.findById(user.userSettingsId);
        if (userSettings) {
          userJson.userSettings = userSettings.toJSON();
        }
      } catch (error) {
        console.error('Error loading UserSettings for user:', error);
      }
    }
    
    return userJson;
  }

  async googleLogin(googleToken, mode = 'login', role = null) {
    // Note: The 'role' parameter is ignored for Google registration.
    // All Google registrations create users with 'client' role and require admin approval.
    console.log('🔵 [Service] ===== googleLogin START =====');
    console.log('🔵 [Service] googleLogin called - mode:', mode, 'role:', role, 'token exists:', !!googleToken);
    if (!googleToken) {
      throw new Error('Google token is required');
    }

    // Check if MongoDB is connected
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not available. Please try again later.');
    }

    try {
      console.log('🔵 [Service] About to verify Google token...');
      // Verify Google token
      const { OAuth2Client } = await import('google-auth-library');
      console.log('🔵 [Service] OAuth2Client imported, GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      
      console.log('🔵 [Service] About to verify ID token...');
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      console.log('🔵 [Service] ID token verified successfully');

      const payload = ticket.getPayload();
      if (!payload) {
        console.error('🔵 [Service] ERROR: No payload from Google token');
        throw new Error('Invalid Google token');
      }
      console.log('🔵 [Service] Payload extracted from token');

      const { email, name, picture, sub: googleId } = payload;
      console.log('🔵 [Service] Google token verified, email:', email, 'mode:', mode);

      // Check if user exists
      console.log('🔵 [Service] About to check if user exists for email:', email);
      let user = await userRepository.findByEmail(email);
      console.log('🔵 [Service] User lookup result:', user ? 'found' : 'not found', 'mode:', mode);
      console.log('🔵 [Service] Mode type:', typeof mode, 'Mode value:', JSON.stringify(mode));
      console.log('🔵 [Service] Mode === "login":', mode === 'login');
      console.log('🔵 [Service] Mode === "register":', mode === 'register');
      
      if (!user) {
        // User doesn't exist
        console.log('🔵 [Service] User does not exist. Checking mode...');
        const normalizedMode = (mode || 'login').toLowerCase().trim();
        console.log('🔵 [Service] Normalized mode:', normalizedMode);
        
        if (normalizedMode === 'login') {
          // For login mode: user must exist, don't auto-create
          console.log('🔵 [Service] Mode is login - blocking access for non-existent user');
          throw new Error('משתמש עם אימייל זה לא קיים במערכת. אנא הירשם תחילה.');
        }
        
        // For register mode: create new user
        console.log('🔵 [Service] Mode is register - creating new user via Google OAuth registration');
      
        const userSettingsData = {
          ownerType: 'client', // Default for client role
          numberOfComplexes: 0
        };

        const userSettings = await userSettingsRepository.create(userSettingsData);
        console.log('✅ [AuthService] UserSettings created for Google registration:', userSettings.id);

        user = await userRepository.create({
          name: name || email.split('@')[0],
          email,
          password: `google_${googleId}_${Date.now()}`, // Random password for Google users
          role: 'client', // ALWAYS 'client' for Google registration - role parameter is ignored
          isApproved: false, // Require admin approval
          isActive: true,
          userSettingsId: userSettings._id // Link UserSettings to User
        });

        // Notify admins about new user registration
        try {
          await this.notifyAdminsNewUserRegistration(user, 'Google');
        } catch (notifyError) {
          console.error('Failed to notify admins about new user:', notifyError);
          // Don't fail the registration if notification fails
        }
      } else {
        // User exists
        if (mode === 'register') {
          // If explicitly trying to register but user already exists, throw error
          throw new Error('משתמש עם אימייל זה כבר קיים במערכת. אנא התחבר במקום.');
        }
        // For login: check if account is active
        if (!user.isActive) {
          throw new Error('Account is deactivated');
        }
      }

      const token = generateToken(user._id.toString());

      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      console.error('🔵 [Service] ===== ERROR in googleLogin =====');
      console.error('🔵 [Service] Error type:', error?.constructor?.name);
      console.error('🔵 [Service] Error message:', error?.message);
      console.error('🔵 [Service] Error stack:', error?.stack);
      console.error('🔵 [Service] ===== END ERROR =====');
      
      if (error.message.includes('Database connection')) {
        throw error;
      }
      if (error.message.includes('deactivated')) {
        throw error;
      }
      if (error.message.includes('לא קיים') || error.message.includes('כבר קיים')) {
        throw error;
      }
      console.error('Google login error:', error);
      throw new Error('Google authentication failed');
    }
  }

  async notifyAdminsNewUserRegistration(newUser, registrationMethod = 'Google') {
    try {
      // Find all admin users
      const admins = await userRepository.findAll({ role: 'admin' });
      
      if (!admins || admins.length === 0) {
        console.log('No admin users found to notify');
        return;
      }

      const userData = newUser.toJSON ? newUser.toJSON() : newUser;
      const userName = userData.name || userData.email;
      const userEmail = userData.email;
      const userPhone = userData.phoneNumber || 'לא צוין';
      const userIdNumber = userData.idNumber || 'לא צוין';

      // Map registration method to Hebrew
      const methodMap = {
        'Google': 'Google',
        'Phone': 'תעודת זהות (טלפון)',
        'Email': 'תעודת זהות (אימייל)',
        'Standard': 'אימייל וסיסמה'
      };
      const methodHebrew = methodMap[registrationMethod] || registrationMethod;

      // Prepare notification message
      const subject = 'הרשמה חדשה למערכת - דורש אישור';
      const message = `
        משתמש חדש נרשם למערכת דרך ${methodHebrew}:
        
        שם: ${userName}
        אימייל: ${userEmail}
        טלפון: ${userPhone}
        תעודת זהות: ${userIdNumber}
        תאריך הרשמה: ${new Date().toLocaleString('he-IL')}
        
        המשתמש נרשם עם הרשאה "לקוח" וממתין לאישור מנהל.
        אנא היכנס למערכת כדי לאשר או לשנות את ההרשאה.
      `;

      // Send email notification to all admins
      for (const admin of admins) {
        if (admin.email) {
          try {
            await emailService.sendEmail(
              admin.email,
              subject,
              `<div dir="rtl" style="font-family: Arial, sans-serif; direction: rtl;">
                <h2>${subject}</h2>
                <p>${message.replace(/\n/g, '<br>')}</p>
              </div>`,
              undefined,
              'ZimmerPro System',
              'New User Registration'
            );
            console.log(`✅ Notification sent to admin: ${admin.email}`);
          } catch (emailError) {
            console.error(`Failed to send email to admin ${admin.email}:`, emailError);
          }
        }
      }
    } catch (error) {
      console.error('Error in notifyAdminsNewUserRegistration:', error);
      throw error;
    }
  }

  // Phone Authentication - uses external SMS service
  // For login: accepts idNumber (looks up phoneNumber from DB) or phoneNumber directly
  // For register: accepts phoneNumber directly
  async sendPhoneOTP(phoneNumberOrIdNumber, mode = 'login', method = 'sms') {
    console.log('📱 [Service] sendPhoneOTP called');
    console.log('📱 [Service] Input phoneNumberOrIdNumber:', phoneNumberOrIdNumber);
    console.log('📱 [Service] Mode:', mode);
    console.log('📱 [Service] Method:', method);
    
    if (!phoneNumberOrIdNumber) {
      console.error('❌ [Service] phoneNumberOrIdNumber is missing!');
      throw new Error('Phone number or ID number is required');
    }

    let cleanPhone = phoneNumberOrIdNumber.replace(/[\s\-\(\)]/g, '');
    let actualIdNumber = null;
    console.log('📱 [Service] Original phoneNumberOrIdNumber:', phoneNumberOrIdNumber);
    console.log('📱 [Service] Cleaned phone/ID:', cleanPhone);
    console.log('📱 [Service] Is 9 digits (ID number)?', /^\d{9}$/.test(cleanPhone));

    // For login mode: if it's an ID number (9 digits), look up phone number from DB
    if (mode === 'login' && /^\d{9}$/.test(cleanPhone)) {
      console.log('🔍 [Service] Detected ID number (9 digits) for login mode');
      // Likely an ID number (9 digits in Israel)
      actualIdNumber = cleanPhone;
      console.log('🔍 [Service] Searching for user with idNumber:', actualIdNumber);
      
      const user = await User.findOne({ idNumber: actualIdNumber });
      if (!user) {
        console.error('❌ [Service] No user found with idNumber:', actualIdNumber);
        throw new Error('No account found with this ID number');
      }
      
      console.log('✅ [Service] User found:', {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber
      });
      
      if (!user.phoneNumber) {
        console.error('❌ [Service] User found but has no phoneNumber!');
        throw new Error('No phone number found for this account');
      }
      cleanPhone = user.phoneNumber.replace(/[\s\-\(\)]/g, '');
      console.log(`📱 [Service] Phone from DB (before conversion): ${cleanPhone}`);
      
      // If phone starts with 0, replace with 972 (Israel country code)
      // The API might need international format without the leading 0
      if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
        const phoneWithoutZero = cleanPhone.substring(1);
        cleanPhone = `972${phoneWithoutZero}`;
        console.log(`📱 [Service] Converted phone to international format: ${cleanPhone}`);
      } else if (cleanPhone.startsWith('+972')) {
        // Already in international format with +
        cleanPhone = cleanPhone.replace('+', '');
        console.log(`📱 [Service] Removed + from phone: ${cleanPhone}`);
      } else if (cleanPhone.startsWith('972') && cleanPhone.length === 12) {
        // Already in international format without +
        console.log(`📱 [Service] Phone already in international format: ${cleanPhone}`);
      }
      
      console.log(`🔍 [Service] Found user by ID number ${actualIdNumber}, using phone: ${cleanPhone}`);
    } else {
      console.log('📱 [Service] Using phone number directly (not ID number lookup)');
      console.log(`📱 [Service] Phone before conversion: ${cleanPhone}`);
      
      // If phone starts with 0, replace with 972 (Israel country code)
      // The API might need international format without the leading 0
      if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
        const phoneWithoutZero = cleanPhone.substring(1);
        cleanPhone = `972${phoneWithoutZero}`;
        console.log(`📱 [Service] Converted phone to international format: ${cleanPhone}`);
      } else if (cleanPhone.startsWith('+972')) {
        // Already in international format with +
        cleanPhone = cleanPhone.replace('+', '');
        console.log(`📱 [Service] Removed + from phone: ${cleanPhone}`);
      } else if (cleanPhone.startsWith('972') && cleanPhone.length === 12) {
        // Already in international format without +
        console.log(`📱 [Service] Phone already in international format: ${cleanPhone}`);
      }
      
      console.log(`📱 [Service] Final phone to send: ${cleanPhone}`);
    }

    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    console.log('📱 [Service] OTP expires at:', new Date(expiresAt).toISOString());

    try {
      // Ensure method is 'sms' or 'voice'
      const apiMethod = (method === 'sms' || method === 'voice') ? method : 'sms';

      if (apiMethod === 'sms') {
        console.log('📱 [Service] ===== SMS METHOD SELECTED =====');
        console.log('📱 [Service] Using Inforu API for SMS');
        
        // Use Inforu API for SMS - generate OTP ourselves
        const otp = Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit code
        console.log('📱 [Service] Generated OTP:', otp);
        
        // Format phone number for Inforu (should be in international format without +)
        // Inforu expects format: 972XXXXXXXXX (without leading 0, without +)
        let formattedPhone = cleanPhone;
        if (formattedPhone.startsWith('+')) {
          formattedPhone = formattedPhone.substring(1);
        }
        // Ensure phone is in international format (972XXXXXXXXX)
        if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
          formattedPhone = '972' + formattedPhone.substring(1);
        }
        
        console.log('📱 [Service] Original phone:', cleanPhone);
        console.log('📱 [Service] Formatted phone for Inforu:', formattedPhone);
        
        // Create SMS message text
        const smsText = `קוד האימות שלך הוא: ${otp}`;
        const senderName = 'ZimmerPro';

        console.log('📱 [Service] About to call smsService.sendMessage');
        console.log('📱 [Service] SMS text:', smsText);
        console.log('📱 [Service] Sender name:', senderName);

        try {
          // Send SMS using Inforu service
          console.log('📱 [Service] Calling smsService.sendMessage...');
          await smsService.sendMessage(smsText, formattedPhone, senderName);
          console.log('📱 [Service] smsService.sendMessage completed successfully');
        } catch (smsError) {
          console.error('❌ [Service] Error in smsService.sendMessage:', smsError);
          console.error('❌ [Service] Error message:', smsError.message);
          console.error('❌ [Service] Error stack:', smsError.stack);
          throw smsError;
        }

        // Store OTP and mode for verification
        // IMPORTANT: Store with formattedPhone (972XXXXXXXXX) to match verification lookup
        // But also keep originalPhone for register mode (to save user with original format)
        console.log('📱 [Service] Storing OTP data in memory...');
        const otpData = {
          otp,
          expiresAt,
          mode: mode || 'login', // 'login' or 'register'
          idNumber: actualIdNumber, // Store ID number if login was by ID
          originalPhone: cleanPhone // Store original phone format for register mode
        };
        console.log('📱 [Service] OTP data stored:', {
          phone: formattedPhone, // Store with formatted phone (972XXXXXXXXX)
          originalPhone: cleanPhone, // Keep original for register mode
          expiresAt: new Date(expiresAt).toISOString(),
          mode: otpData.mode,
          idNumber: otpData.idNumber
        });
        // Store with formattedPhone so verification can find it
        otpStorage.set(formattedPhone, otpData);

        console.log(`✅ [Service] SMS sent successfully to ${formattedPhone} (original: ${cleanPhone}, mode: ${mode})`);
        return {
          message: 'OTP sent successfully',
          method: 'sms'
        };
      } else {
        // Use old API for voice calls - ORIGINAL CODE (don't generate OTP, let API handle it)
        const url = 'https://wa.message.co.il/phone-auth.php';
        
        // Build URL with parameters
        const params = new URLSearchParams();
        params.append('phone', cleanPhone);
        params.append('via', 'voice');

        const fullUrl = `${url}?${params}`;
        console.log('📞 [Service] Preparing Voice OTP API call');
        console.log('📞 [Service] Base URL:', url);
        console.log('📞 [Service] Phone to send:', cleanPhone);
        console.log('📞 [Service] Original method:', method);
        console.log('📞 [Service] API method (via):', 'voice');
        console.log('📞 [Service] Mode:', mode);
        console.log('📞 [Service] Full URL:', fullUrl);
        console.log('📞 [Service] Request method: GET');

        console.log('📞 [Service] Making fetch request...');
        const fetchStartTime = Date.now();
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'ZimmerPro-Backend/1.0'
          }
        });

        const fetchDuration = Date.now() - fetchStartTime;
        console.log('📞 [Service] Fetch completed in', fetchDuration, 'ms');
        console.log('📞 [Service] API Response Status:', response.status, response.statusText);
        console.log('📞 [Service] Response OK?', response.ok);
        console.log('📞 [Service] Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

        // Read response body first to check for errors
        const responseBody = await response.text().catch((err) => {
          console.error('❌ [Service] Error reading response body:', err);
          return '';
        });
        console.log('📞 [Service] Response body length:', responseBody.length);
        console.log('📞 [Service] Response body (first 200 chars):', responseBody.substring(0, 200));
        console.log('📞 [Service] Response body (full):', responseBody);
        
        // Check for rate limiting (429) - handle this specifically
        if (response.status === 429) {
          console.error('❌ [Service] Rate limit exceeded (429) - Too many requests');
          console.error('❌ [Service] Response body:', responseBody);
          
          // Try to parse JSON response for more details
          let errorDetails = '';
          try {
            const jsonError = JSON.parse(responseBody);
            if (jsonError.status || jsonError.message) {
              errorDetails = jsonError.message || jsonError.status;
            }
          } catch (e) {
            // Not JSON, use body as is
            errorDetails = responseBody;
          }
          
          const errorMsg = `יותר מדי בקשות. ${errorDetails ? `(${errorDetails})` : ''} אנא נסה שוב בעוד כמה דקות.`;
          
          throw new Error(errorMsg);
        }

        // Extract session cookie from response headers
        const setCookieHeader = response.headers.get('set-cookie');
        let sessionCookie = null;
        
        if (setCookieHeader) {
          console.log(`📞 Session Cookie received: ${setCookieHeader.substring(0, 50)}...`);
          // Extract the cookie value (usually first cookie in the header)
          const cookieMatch = setCookieHeader.match(/([^;]+)/);
          if (cookieMatch) {
            sessionCookie = cookieMatch[1];
          }
        } else {
          console.log('⚠️  No Set-Cookie header in response');
        }

        // Check if successful (status 200 or response body indicates success)
        const bodyLower = responseBody.toLowerCase();
        const hasOk = bodyLower.includes('ok');
        const hasSent = bodyLower.includes('sent');
        const hasSuccess = bodyLower.includes('success');
        const isStatus200 = response.status === 200;
        const isResponseOk = response.ok;
        
        // Check for XML response (the API returns XML format)
        let xmlStatus = null;
        let xmlDescription = null;
        if (responseBody.includes('<Result>') || responseBody.includes('<Status>')) {
          // Parse XML response
          const statusMatch = responseBody.match(/<Status>(\d+)<\/Status>/);
          const descMatch = responseBody.match(/<Description>(.*?)<\/Description>/);
          if (statusMatch) {
            xmlStatus = parseInt(statusMatch[1]);
            xmlDescription = descMatch ? descMatch[1] : null;
            console.log('📞 [Service] XML Response - Status:', xmlStatus, 'Description:', xmlDescription);
          }
        }
        
        // Check if response is JSON and has success status
        let jsonResponse = null;
        try {
          jsonResponse = JSON.parse(responseBody);
        } catch (e) {
          // Not JSON, continue with text check
        }
        
        console.log('📞 [Service] Success indicators:');
        console.log('  - response.ok:', isResponseOk);
        console.log('  - status === 200:', isStatus200);
        console.log('  - body includes "ok":', hasOk);
        console.log('  - body includes "sent":', hasSent);
        console.log('  - body includes "success":', hasSuccess);
        console.log('  - XML Status:', xmlStatus);
        console.log('  - XML Description:', xmlDescription);
        console.log('  - JSON response:', jsonResponse);
        console.log('  - Method used:', method);
        
        // Check for error indicators in response
        const hasErrorIndicators = bodyLower.includes('error') || bodyLower.includes('fail') || bodyLower.includes('invalid') || bodyLower.includes('not found');
        
        // More strict success check - require explicit success indicators
        // Don't assume success just because status is 200
        let isSuccess = false;
        
        // Check XML response first (the API returns XML)
        if (xmlStatus !== null) {
          // Status 1 = success, Status 0 = error
          if (xmlStatus === 1) {
            isSuccess = true;
            console.log('📞 [Service] Success from XML response - Status 1');
            if (xmlDescription) {
              console.log('📞 [Service] XML Description:', xmlDescription);
            }
          } else {
            isSuccess = false;
            console.log('📞 [Service] Error in XML response - Status:', xmlStatus);
            if (xmlDescription) {
              console.log('📞 [Service] XML Error Description:', xmlDescription);
            }
          }
        }
        
        // If not determined from XML, check JSON response
        if (!isSuccess && jsonResponse) {
          if (jsonResponse.status === 'ok' || jsonResponse.success === true || jsonResponse.status === 'success') {
            isSuccess = true;
            console.log('📞 [Service] Success from JSON response');
          } else if (jsonResponse.status === 'error' || jsonResponse.error || jsonResponse.success === false) {
            isSuccess = false;
            console.log('📞 [Service] Error in JSON response:', jsonResponse);
          }
        }
        
        // If not determined from XML/JSON, check text response
        if (isSuccess === false) {
          if (hasOk || hasSent || hasSuccess) {
            isSuccess = true;
            console.log('📞 [Service] Success from text response keywords');
          } else if (hasErrorIndicators) {
            isSuccess = false;
            console.log('📞 [Service] Error indicators found in response');
          } else if (isStatus200 && responseBody.trim().length > 0) {
            // If status 200 and has body content (even if no keywords), might be success
            // But be more cautious - only if body doesn't look like an error
            const looksLikeError = bodyLower.includes('not') || bodyLower.includes('cannot') || bodyLower.includes('unable');
            if (!looksLikeError) {
              console.log('📞 [Service] Status 200 with body content - treating as potential success');
              isSuccess = true;
            }
          } else if (isStatus200 && responseBody.trim().length === 0) {
            // For voice, empty response with 200 might be OK
            console.log('📞 [Service] Voice: Empty response with 200 status - treating as success');
            isSuccess = true;
          }
        }
        
        console.log('📞 [Service] Overall success?', isSuccess);
        console.log('📞 [Service] Has error indicators?', hasErrorIndicators);
        console.log('📞 [Service] Response body empty?', responseBody.trim().length === 0);

        if (isSuccess) {
          // Store session cookie and mode for verification
          // Store by phone number, but also keep idNumber for login lookup
          console.log('📞 [Service] Storing OTP data in memory...');
          const otpData = {
            sessionCookie,
            expiresAt,
            mode: mode || 'login', // 'login' or 'register'
            idNumber: actualIdNumber // Store ID number if login was by ID
          };
          console.log('📞 [Service] OTP data stored:', {
            phone: cleanPhone,
            hasSessionCookie: !!sessionCookie,
            expiresAt: new Date(expiresAt).toISOString(),
            mode: otpData.mode,
            idNumber: otpData.idNumber
          });
          otpStorage.set(cleanPhone, otpData);

          console.log(`✅ [Service] Voice call initiated successfully to ${cleanPhone} via voice (mode: ${mode})`);
          return {
            message: 'OTP sent successfully',
            method: 'voice'
          };
        } else {
          console.error('❌ [Service] Voice OTP sending failed!');
          console.error('❌ [Service] Method used:', method);
          console.error('❌ [Service] Status:', response.status);
          console.error('❌ [Service] Status Text:', response.statusText);
          console.error('❌ [Service] Response Body:', responseBody);
          console.error('❌ [Service] Response Body Length:', responseBody.length);
          console.error('❌ [Service] Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
          
          const errorMsg = `שליחת קוד בשיחה קולית נכשלה. סטטוס: ${response.status}. ${responseBody || 'אנא נסה שוב.'}`;
          
          throw new Error(errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ [Service] Error in sendPhoneOTP catch block:', error);
      console.error('❌ [Service] Error name:', error?.name);
      console.error('❌ [Service] Error message:', error?.message);
      console.error('❌ [Service] Error stack:', error?.stack);
      
      if (error.message && error.message.includes('Failed to send')) {
        throw error;
      }
      throw new Error('Error sending OTP: ' + (error.message || 'Unknown error'));
    }
  }

  async verifyPhoneOTP(phoneNumberOrIdNumber, otp, userData = {}) {
    console.log('🔐 [Service] verifyPhoneOTP called');
    console.log('🔐 [Service] Input phoneNumberOrIdNumber:', phoneNumberOrIdNumber);
    console.log('🔐 [Service] Input OTP:', otp);
    console.log('🔐 [Service] Input userData:', JSON.stringify(userData));
    
    if (!phoneNumberOrIdNumber || !otp) {
      throw new Error('Phone number or ID number and OTP are required');
    }

    let cleanPhone = phoneNumberOrIdNumber.replace(/[\s\-\(\)]/g, '');
    let actualIdNumber = null;

    // For login: if it's an ID number, look up phone number from DB
    if (/^\d{9}$/.test(cleanPhone)) {
      // Likely an ID number (9 digits)
      console.log('🔐 [Service] Detected ID number (9 digits) for verification');
      actualIdNumber = cleanPhone;
      console.log('🔐 [Service] Searching for user with idNumber:', actualIdNumber);
      
      const user = await User.findOne({ idNumber: actualIdNumber });
      if (!user) {
        console.error('❌ [Service] No user found with idNumber:', actualIdNumber);
        throw new Error('No account found with this ID number');
      }
      if (!user.phoneNumber) {
        console.error('❌ [Service] User found but has no phoneNumber!');
        throw new Error('No phone number found for this account');
      }
      cleanPhone = user.phoneNumber.replace(/[\s\-\(\)]/g, '');
      console.log('🔐 [Service] Found user by ID number, using phone:', cleanPhone);
    } else {
      console.log('🔐 [Service] Using phone number directly (not ID number lookup)');
    }

    // Convert phone to international format (972XXXXXXXXX) to match storage format
    // OTP is stored with formattedPhone (972XXXXXXXXX), so we need to match that format
    let lookupPhone = cleanPhone;
    if (lookupPhone.startsWith('+')) {
      lookupPhone = lookupPhone.substring(1);
    }
    // Convert to international format if needed
    if (lookupPhone.startsWith('0') && lookupPhone.length === 10) {
      lookupPhone = '972' + lookupPhone.substring(1);
    } else if (!lookupPhone.startsWith('972') && lookupPhone.length === 9) {
      // If it's 9 digits without country code, add 972
      lookupPhone = '972' + lookupPhone;
    }

    
    console.log('🔐 [Service] All stored OTPs:', Array.from(otpStorage.keys()));
    
    // Try both formats in case storage has different format
    let stored = otpStorage.get(lookupPhone);
    if (!stored) {
      // Try with original format as fallback
      stored = otpStorage.get(cleanPhone);
      if (stored) {
        console.log('🔐 [Service] Found OTP with original phone format:', cleanPhone);
        lookupPhone = cleanPhone; // Use original format for rest of function
      }
    }

    if (!stored) {
    
      throw new Error('OTP not found or expired. Please request a new OTP.');
    }

    console.log('🔐 [Service] OTP found in storage:', {
      hasSessionCookie: !!stored.sessionCookie,
      expiresAt: new Date(stored.expiresAt).toISOString(),
      mode: stored.mode,
      idNumber: stored.idNumber,
      isExpired: Date.now() > stored.expiresAt
    });

    if (Date.now() > stored.expiresAt) {
      console.error('❌ [Service] OTP expired!');
      console.error('  - Current time:', new Date(Date.now()).toISOString());
      console.error('  - Expires at:', new Date(stored.expiresAt).toISOString());
      otpStorage.delete(lookupPhone);
      throw new Error('OTP expired. Please request a new OTP.');
    }

    try {
      // Check if this is SMS (has direct OTP) or Voice (has sessionCookie)
      if (stored.otp) {
        // SMS - verify OTP directly (we generated it ourselves)
        console.log('🔐 [Service] Verifying SMS OTP directly');
        console.log('🔐 [Service] Provided OTP:', otp);
        console.log('🔐 [Service] Stored OTP:', stored.otp);

        // Compare OTP codes
        if (stored.otp !== otp) {
          console.error('❌ [Service] OTP mismatch!');
          console.error('  - Provided:', otp);
          console.error('  - Expected:', stored.otp);
          throw new Error('Invalid OTP');
        }

        console.log('✅ [Service] SMS OTP verified successfully');
      } else if (stored.sessionCookie) {
        // Voice - verify OTP with external SMS service (original code)
        console.log('🔐 [Service] Verifying Voice OTP with external service');
        const url = 'https://wa.message.co.il/phone-auth.php';
        const params = new URLSearchParams({
          phone: cleanPhone,
          code: otp
        });

        const headers = {
          'User-Agent': 'ZimmerPro-Backend/1.0'
        };

        // Add session cookie if available
        if (stored.sessionCookie) {
          headers['Cookie'] = stored.sessionCookie;
          console.log('🔐 [Service] Using session cookie for verification');
        } else {
          console.log('⚠️ [Service] No session cookie available for verification');
        }

        const fullUrl = `${url}?${params}`;
        console.log('🔐 [Service] Verifying OTP with external service');
        console.log('🔐 [Service] Full URL:', fullUrl);
        console.log('🔐 [Service] Headers:', JSON.stringify(headers));

        const response = await fetch(fullUrl, {
          method: 'GET',
          headers
        });

        const body = await response.text().catch(() => '');
        const bodyLower = body.toLowerCase();
        
        console.log('🔐 [Service] Verification response status:', response.status, response.statusText);
        console.log('🔐 [Service] Verification response body:', body);

        // Check if verification was successful
        // More flexible verification - accept 200 status or positive body content
        const hasOk = bodyLower.includes('ok');
        const hasVerified = bodyLower.includes('verified');
        const hasSuccess = bodyLower.includes('success');
        const hasValid = bodyLower.includes('valid'); // NEW: Check for "valid" status
        const isStatus200 = response.status === 200;
        const isResponseOk = response.ok;
        
        // If status is 200 or response is ok, and body doesn't explicitly say "error" or "invalid", consider it verified
        const hasErrorIndicators = bodyLower.includes('error') || bodyLower.includes('invalid') || bodyLower.includes('failed') || bodyLower.includes('wrong');
        
        // Simple logic: if status is 200 and no errors, it's verified
        // The API returns {"status":"valid"} on success with 200, so we just need to check for errors
        const isVerified = isStatus200 && !hasErrorIndicators;

        console.log('🔐 [Service] Verification success indicators:');
        console.log('  - response.ok:', isResponseOk);
        console.log('  - status === 200:', isStatus200);
        console.log('  - body includes "ok":', hasOk);
        console.log('  - body includes "verified":', hasVerified);
        console.log('  - body includes "success":', hasSuccess);
        console.log('  - body includes "valid":', hasValid);
        console.log('  - body has error indicators:', hasErrorIndicators);
        console.log('  - (status 200 && !errors):', isStatus200 && !hasErrorIndicators);
        console.log('🔐 [Service] Overall verified?', isVerified);

        if (!isVerified) {
          console.error('❌ [Service] Voice OTP verification failed!');
          console.error('  - Status:', response.status);
          console.error('  - Status Text:', response.statusText);
          console.error('  - Body:', body);
          throw new Error('Invalid OTP or expired');
        }

        console.log('✅ [Service] Voice OTP verified successfully');
      } else {
        console.error('❌ [Service] No OTP or session cookie found in storage!');
        throw new Error('OTP not found. Please request a new OTP.');
      }

      // OTP verified - remove it (use lookupPhone which is the key in storage)
      otpStorage.delete(lookupPhone);

      // Handle login or registration (use stored mode from sendPhoneOTP)
      const mode = stored.mode || (userData.name ? 'register' : 'login');
      
      if (mode === 'register') {
        // Registration
        // Use original phone format (from stored.originalPhone) for user creation
        // This ensures we save the phone in the format the user entered (e.g., 0533339724)
        const phoneForUser = stored.originalPhone || cleanPhone;
        
        console.log('🔐 [Service] Register mode - using phone:', phoneForUser);
        console.log('🔐 [Service] Original phone from storage:', stored.originalPhone);
        console.log('🔐 [Service] Clean phone:', cleanPhone);
        
        if (!userData.name && !userData.firstName) {
          throw new Error('Name is required for registration');
        }

        // Check if user already exists by phone (try both formats)
        let existingUser = await User.findOne({ phoneNumber: phoneForUser });
        if (!existingUser && phoneForUser !== cleanPhone) {
          existingUser = await User.findOne({ phoneNumber: cleanPhone });
        }
        if (existingUser) {
          throw new Error('User with this phone number already exists');
        }

        // Create new user with phone number and all provided data
        // Use provided email or generate temporary one
        const userEmail = userData.email || `${phoneForUser}@zimmerpro.local`;
        const fullName = userData.name || (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : userData.firstName || '');
        
        if (!fullName) {
          throw new Error('Name is required for registration');
        }
        
        console.log('🔐 [Service] Creating new user with:', {
          name: fullName,
          email: userEmail,
          phoneNumber: phoneForUser,
          idNumber: userData.idNumber
        });
        
        // Create UserSettings first (required for every user)
        // Phone registrations always get 'client' role, so ownerType should be 'client'
        const finalRole = userData.role || 'client'; // Default to 'client' for phone registration
        let ownerType = 'client'; // default for client role
        if (finalRole === 'admin') {
          ownerType = 'admin';
        } else if (finalRole === 'complex_owner' || finalRole === 'manager') {
          ownerType = 'complex_owner';
        } else if (finalRole === 'zimmer_owner') {
          ownerType = 'zimmer_owner';
        }

        const userSettingsData = {
          ownerType: ownerType,
          numberOfComplexes: 0 // Default for new client registrations
        };

        const userSettings = await userSettingsRepository.create(userSettingsData);
        console.log('✅ [AuthService] UserSettings created for phone registration:', userSettings.id);
        
        const user = await userRepository.create({
          name: fullName,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userEmail,
          password: userData.password || `phone_${phoneForUser}_${Date.now()}`, // Use provided password or generate random
          phoneNumber: phoneForUser, // Use original phone format
          idNumber: userData.idNumber,
          role: finalRole,
          isApproved: false,
          isActive: true,
          userSettingsId: userSettings._id // Link UserSettings to User
        });

        // Notify admins about new user registration
        try {
          await this.notifyAdminsNewUserRegistration(user, 'Phone');
        } catch (notifyError) {
          console.error('Failed to notify admins about new user:', notifyError);
          // Don't fail the registration if notification fails
        }

        const token = generateToken(user._id.toString());
        return {
          user: user.toJSON(),
          token
        };
      } else {
        // Login - find user by phone or ID number
        let user = null;
        if (actualIdNumber || stored.idNumber) {
          // Login by ID number
          user = await User.findOne({ idNumber: actualIdNumber || stored.idNumber });
        } else {
          // Login by phone number
          user = await User.findOne({ phoneNumber: cleanPhone });
        }
        
        if (!user) {
          throw new Error('No account found');
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated');
        }

        const token = generateToken(user._id.toString());
        return {
          user: user.toJSON(),
          token
        };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      if (error.message.includes('Invalid OTP') || error.message.includes('expired')) {
        throw error;
      }
      throw new Error('Error verifying OTP: ' + (error.message || 'Unknown error'));
    }
  }

  // Email Authentication - uses external email service
  // For login: accepts idNumber (looks up email from DB)
  // For register: accepts email directly
  async sendEmailOTP(idNumberOrEmail, mode = 'login') {
    console.log('📧 [Service] sendEmailOTP called');
    console.log('📧 [Service] Input idNumberOrEmail:', idNumberOrEmail);
    console.log('📧 [Service] Mode:', mode);
    
    if (!idNumberOrEmail) {
      console.error('❌ [Service] idNumberOrEmail is missing!');
      throw new Error('ID number or email is required');
    }

    let actualEmail = null;
    let actualIdNumber = null;

    // For login mode: if it's an ID number (9 digits), look up email from DB
    if (mode === 'login' && /^\d{9}$/.test(idNumberOrEmail)) {
      console.log('🔍 [Service] Detected ID number (9 digits) for login mode');
      actualIdNumber = idNumberOrEmail;
      console.log('🔍 [Service] Searching for user with idNumber:', actualIdNumber);
      
      const user = await User.findOne({ idNumber: actualIdNumber });
      if (!user) {
        console.error('❌ [Service] No user found with idNumber:', actualIdNumber);
        throw new Error('No account found with this ID number');
      }
      
      console.log('✅ [Service] User found:', {
        id: user._id,
        name: user.name,
        email: user.email
      });
      
      if (!user.email) {
        console.error('❌ [Service] User found but has no email!');
        throw new Error('No email found for this account');
      }
      actualEmail = user.email.toLowerCase().trim();
      console.log(`🔍 [Service] Found user by ID number ${actualIdNumber}`);
      console.log(`🔍 [Service] Original email from DB: "${user.email}"`);
      console.log(`🔍 [Service] Normalized email: "${actualEmail}"`);
    } else {
      // Register mode or direct email
      actualEmail = idNumberOrEmail.toLowerCase().trim();
      console.log('📧 [Service] Using email directly:', actualEmail);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(actualEmail)) {
      throw new Error('Invalid email address');
    }

    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    console.log('📧 [Service] OTP expires at:', new Date(expiresAt).toISOString());

    try {
      // Generate OTP code (5 digits)
      const otp = Math.floor(10000 + Math.random() * 90000).toString();
      console.log('📧 [Service] Generated OTP:', otp);

      // Create email content
      const subject = 'קוד אימות ZimmerPro';
      const body = `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin-bottom: 20px;">קוד אימות ZimmerPro</h2>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">
              שלום,<br><br>
              קיבלת בקשה לאימות חשבון ב-ZimmerPro.<br><br>
              <strong style="color: #1e293b; font-size: 24px; letter-spacing: 5px; display: inline-block; padding: 10px 20px; background-color: #f1f5f9; border-radius: 5px; margin: 20px 0;">
                ${otp}
              </strong><br><br>
              קוד זה תקף ל-10 דקות.<br><br>
              אם לא ביקשת קוד זה, אנא התעלם מהודעה זו.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              ZimmerPro - מערכת ניהול צימרים ומתחמי אירוח
            </p>
          </div>
        </div>
      `;

      // Use whitelisted email address - default to the account username email
      const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'admin@chatgo.live';
      const fromName = 'ZimmerPro';
      const campaignName = mode === 'login' ? 'ZimmerPro Login OTP' : 'ZimmerPro Registration OTP';

      console.log('📧 [Service] About to call emailService.sendEmail');
      console.log('📧 [Service] Email subject:', subject);
      console.log('📧 [Service] From address:', fromAddress);

      try {
        // Send email using Mesergo service
        console.log('📧 [Service] Calling emailService.sendEmail...');
        await emailService.sendEmail(actualEmail, subject, body, fromAddress, fromName, campaignName);
        console.log('📧 [Service] emailService.sendEmail completed successfully');
      } catch (emailError) {
        console.error('❌ [Service] Error in emailService.sendEmail:', emailError);
        console.error('❌ [Service] Error message:', emailError.message);
        console.error('❌ [Service] Error stack:', emailError.stack);
        throw emailError;
      }

      // Store OTP and mode for verification
      console.log('📧 [Service] Storing OTP data in memory...');
      console.log('📧 [Service] OTP to store:', otp);
      console.log('📧 [Service] Email key:', actualEmail);
      
      // Delete any existing OTP for this email first to avoid conflicts
      if (emailOtpStorage.has(actualEmail)) {
        console.log('📧 [Service] Removing existing OTP for this email');
        emailOtpStorage.delete(actualEmail);
      }
      
      const otpData = {
        otp,
        expiresAt,
        mode: mode || 'login', // 'login' or 'register'
        idNumber: actualIdNumber, // Store ID number if login was by ID
        email: actualEmail // Store email for verification
      };
      console.log('📧 [Service] OTP data to store:', {
        otp: otpData.otp,
        email: actualEmail,
        expiresAt: new Date(expiresAt).toISOString(),
        mode: otpData.mode,
        idNumber: otpData.idNumber
      });
      emailOtpStorage.set(actualEmail, otpData);
      
      // Verify it was stored correctly
      const storedCheck = emailOtpStorage.get(actualEmail);
      console.log('📧 [Service] Verification - OTP stored correctly:', storedCheck?.otp === otp);
      console.log('📧 [Service] Verification - Stored OTP value:', storedCheck?.otp);

      console.log(`✅ [Service] Email sent successfully to ${actualEmail} (mode: ${mode})`);
      return {
        message: 'OTP sent successfully via email',
        method: 'email'
      };
    } catch (error) {
      console.error('❌ [Service] Error in sendEmailOTP catch block:', error);
      console.error('❌ [Service] Error name:', error?.name);
      console.error('❌ [Service] Error message:', error?.message);
      console.error('❌ [Service] Error stack:', error?.stack);
      
      if (error.message && error.message.includes('Failed to send')) {
        throw error;
      }
      throw new Error('Error sending email OTP: ' + (error.message || 'Unknown error'));
    }
  }

  async verifyEmailOTP(idNumberOrEmail, otp, userData = {}) {
    console.log('🔐 [Service] verifyEmailOTP called');
    console.log('🔐 [Service] Input idNumberOrEmail:', idNumberOrEmail);
    console.log('🔐 [Service] Input OTP:', otp);
    console.log('🔐 [Service] Input userData:', JSON.stringify(userData));
    
    if (!idNumberOrEmail || !otp) {
      throw new Error('ID number or email and OTP are required');
    }

    let actualEmail = null;
    let actualIdNumber = null;

    // For login: if it's an ID number, look up email from DB
    if (/^\d{9}$/.test(idNumberOrEmail)) {
      // Likely an ID number (9 digits)
      console.log('🔐 [Service] Detected ID number (9 digits) for verification');
      actualIdNumber = idNumberOrEmail;
      console.log('🔐 [Service] Searching for user with idNumber:', actualIdNumber);
      
      const user = await User.findOne({ idNumber: actualIdNumber });
      if (!user) {
        console.error('❌ [Service] No user found with idNumber:', actualIdNumber);
        throw new Error('No account found with this ID number');
      }
      if (!user.email) {
        console.error('❌ [Service] User found but has no email!');
        throw new Error('No email found for this account');
      }
      actualEmail = user.email.toLowerCase().trim();
      console.log('🔐 [Service] Found user by ID number, using email:', actualEmail);
    } else {
      // Direct email
      actualEmail = idNumberOrEmail.toLowerCase().trim();
      console.log('🔐 [Service] Using email directly (not ID number lookup)');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(actualEmail)) {
      throw new Error('Invalid email address');
    }

    console.log('🔐 [Service] All stored email OTPs:', Array.from(emailOtpStorage.keys()));
    console.log('🔐 [Service] Looking for OTP with email key:', actualEmail);
    
    // Get stored OTP data
    const stored = emailOtpStorage.get(actualEmail);
    
    if (stored) {
      console.log('🔐 [Service] Found stored OTP data:', {
        otp: stored.otp,
        email: stored.email,
        mode: stored.mode,
        idNumber: stored.idNumber
      });
    }

    if (!stored) {
      throw new Error('OTP not found or expired. Please request a new OTP.');
    }

    console.log('🔐 [Service] OTP found in storage:', {
      expiresAt: new Date(stored.expiresAt).toISOString(),
      mode: stored.mode,
      idNumber: stored.idNumber,
      isExpired: Date.now() > stored.expiresAt
    });

    if (Date.now() > stored.expiresAt) {
      console.error('❌ [Service] OTP expired!');
      console.error('  - Current time:', new Date(Date.now()).toISOString());
      console.error('  - Expires at:', new Date(stored.expiresAt).toISOString());
      emailOtpStorage.delete(actualEmail);
      throw new Error('OTP expired. Please request a new OTP.');
    }

    try {
      // Verify OTP directly (we generated it ourselves)
      console.log('🔐 [Service] Verifying Email OTP directly');
      console.log('🔐 [Service] Provided OTP:', otp);
      console.log('🔐 [Service] Stored OTP:', stored.otp);

      // Compare OTP codes
      if (stored.otp !== otp) {
        console.error('❌ [Service] OTP mismatch!');
        console.error('  - Provided:', otp);
        console.error('  - Expected:', stored.otp);
        throw new Error('Invalid OTP');
      }

      console.log('✅ [Service] Email OTP verified successfully');

      // OTP verified - remove it
      emailOtpStorage.delete(actualEmail);

      // Handle login or registration (use stored mode from sendEmailOTP)
      const mode = stored.mode || (userData.name ? 'register' : 'login');
      
      if (mode === 'register') {
        // Registration
        console.log('🔐 [Service] Register mode - using email:', actualEmail);
        
        if (!userData.name && !userData.firstName) {
          throw new Error('Name is required for registration');
        }

        // Check if user already exists by email
        const existingUser = await User.findOne({ email: actualEmail });
        if (existingUser) {
          throw new Error('User with this email already exists');
        }

        // Create new user with email and all provided data
        const fullName = userData.name || (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : userData.firstName || '');
        
        if (!fullName) {
          throw new Error('Name is required for registration');
        }
        
        console.log('🔐 [Service] Creating new user with:', {
          name: fullName,
          email: actualEmail,
          idNumber: userData.idNumber
        });
        
        // Create UserSettings first (required for every user)
        // Email registrations always get 'client' role, so ownerType should be 'client'
        const finalRole = userData.role || 'client'; // Default to 'client' for email registration
        let ownerType = 'client'; // default for client role
        if (finalRole === 'admin') {
          ownerType = 'admin';
        } else if (finalRole === 'complex_owner' || finalRole === 'manager') {
          ownerType = 'complex_owner';
        } else if (finalRole === 'zimmer_owner') {
          ownerType = 'zimmer_owner';
        }

        const userSettingsData = {
          ownerType: ownerType,
          numberOfComplexes: 0 // Default for new client registrations
        };

        const userSettings = await userSettingsRepository.create(userSettingsData);
        console.log('✅ [AuthService] UserSettings created for email registration:', userSettings.id);
        
        const user = await userRepository.create({
          name: fullName,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: actualEmail,
          password: userData.password || `email_${actualEmail}_${Date.now()}`, // Use provided password or generate random
          phoneNumber: userData.phoneNumber,
          idNumber: userData.idNumber,
          role: finalRole,
          isApproved: false,
          isActive: true,
          userSettingsId: userSettings._id // Link UserSettings to User
        });

        // Notify admins about new user registration
        try {
          await this.notifyAdminsNewUserRegistration(user, 'Email');
        } catch (notifyError) {
          console.error('Failed to notify admins about new user:', notifyError);
          // Don't fail the registration if notification fails
        }

        const token = generateToken(user._id.toString());
        return {
          user: user.toJSON(),
          token
        };
      } else {
        // Login - find user by email or ID number
        let user = null;
        if (actualIdNumber || stored.idNumber) {
          // Login by ID number
          user = await User.findOne({ idNumber: actualIdNumber || stored.idNumber });
        } else {
          // Login by email
          user = await User.findOne({ email: actualEmail });
        }
        
        if (!user) {
          throw new Error('No account found');
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated');
        }

        const token = generateToken(user._id.toString());
        return {
          user: user.toJSON(),
          token
        };
      }
    } catch (error) {
      console.error('Error verifying email OTP:', error);
      if (error.message.includes('Invalid OTP') || error.message.includes('expired')) {
        throw error;
      }
      throw new Error('Error verifying email OTP: ' + (error.message || 'Unknown error'));
    }
  }
}

export default new AuthService();
