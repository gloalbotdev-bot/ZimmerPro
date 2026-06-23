
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, User, UserRole } from '../types';
import { Smartphone, Mail, Chrome, ShieldCheck, Lock, UserCircle, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { authAPI, setAuthToken } from '../api';

interface Props {
  db: AppState;
  onLogin: (user: User, token?: string) => void;
  onRegister: (user: User) => void;
}

const AuthPage: React.FC<Props> = ({ db, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [method, setMethod] = useState<'phone' | 'google' | 'email'>('phone');
  const [step, setStep] = useState<1 | 2>(1); // 1: Input, 2: 2FA/Confirmation
  const [loading, setLoading] = useState(false);
  const [showFallbackButton, setShowFallbackButton] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '']); // 5 digits OTP
  const googleButtonRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    idNumber: '',
    firstName: '',
    lastName: '',
    otp: '',
    name: '',
    role: UserRole.ZIMMER_OWNER
  });
  const [otpMethod, setOtpMethod] = useState<'sms' | 'voice' | 'email'>('sms'); // SMS, Voice call, or Email

  const handleGoogleAuth = useCallback(async (googleToken: string) => {
    setLoading(true);
    try {
      // For Google registration, role is always 'client' (set on backend)
      // For login, no role needed
      const result = await authAPI.googleLogin(googleToken, mode);
      if (result.token) {
        setAuthToken(result.token);
      }
      
      const user: User = {
        id: result.user.id || result.user._id,
        name: result.user.name,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber,
        role: result.user.role as UserRole, // Use role from server (will be 'client' for Google registration)
        userSettingsId: result.user.userSettingsId,
        userSettings: result.user.userSettings, // Include UserSettings from API response
        isActive: result.user.isActive !== false,
        isApproved: result.user.isApproved || false,
        createdAt: result.user.createdAt || new Date().toISOString().split('T')[0],
        preferredLanguage: result.user.preferredLanguage || 'he',
        googleCalendarLinked: result.user.googleCalendarLinked || false
      };

      if (mode === 'login') {
        onLogin(user, result.token);
      } else {
        // For registration, show message about pending approval
        if (!user.isApproved) {
          alert('ההרשמה בוצעה בהצלחה! המשתמש נוצר עם הרשאה "לקוח" וממתין לאישור מנהל. תקבל התראה כאשר החשבון יאושר.');
        }
        onRegister(user);
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      alert(error?.message || `שגיאה ב${mode === 'login' ? 'התחברות' : 'הרשמה'} עם Google. אנא נסה שוב או השתמש באימייל וסיסמה.`);
    } finally {
      setLoading(false);
    }
  }, [mode, formData.role, onLogin, onRegister]);

  // Load Google Identity Services and initialize button
  useEffect(() => {
    if (method === 'google') {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
      
      if (!googleClientId) {
        console.warn('VITE_GOOGLE_CLIENT_ID לא מוגדר');
        setShowFallbackButton(true);
        return;
      }

      setShowFallbackButton(false);

      // Load Google Identity Services script
      const loadGoogleScript = () => {
        if ((window as any).google?.accounts?.id) {
          setTimeout(() => initializeGoogle(googleClientId), 100);
          return;
        }

        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => {
            setTimeout(() => initializeGoogle(googleClientId), 100);
          });
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setTimeout(() => initializeGoogle(googleClientId), 100);
        };
        script.onerror = () => {
          console.error('Failed to load Google Identity Services');
        };
        document.head.appendChild(script);
      };

      const initializeGoogle = (clientId: string) => {
        if (!(window as any).google?.accounts?.id) {
          console.warn('Google Identity Services לא נטען');
          return;
        }
        if (!googleButtonRef.current) {
          console.warn('googleButtonRef.current is null');
          return;
        }

        // Clear previous button
        googleButtonRef.current.innerHTML = '';

        try {
          // Initialize Google Identity Services
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              if (response.credential) {
                await handleGoogleAuth(response.credential);
              }
            }
          });

          // Render button
          (window as any).google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: mode === 'login' ? 'signin_with' : 'signup_with',
            width: 300,
            locale: 'he'
          });
        } catch (error) {
          console.error('Error initializing Google button:', error);
        }
      };

      if (googleButtonRef.current) {
        loadGoogleScript();
      } else {
        const timer = setTimeout(() => {
          if (googleButtonRef.current) {
            loadGoogleScript();
          }
        }, 100);
        return () => clearTimeout(timer);
      }

      // Cleanup
      return () => {
        // Don't clear on cleanup, let React handle it
      };
    }
  }, [method, mode, handleGoogleAuth]);

  const handleAction = async () => {
    setLoading(true);
    
    try {
      if (mode === 'login') {
        if (method === 'google') {
          // Google OAuth is handled via button click and callback
          // The button triggers handleGoogleAuth automatically
          setLoading(false);
          return;
        } else if (method === 'email') {
          if (!formData.email || !formData.password) {
            alert('אנא מלא אימייל וסיסמה');
            setLoading(false);
            return;
          }

          try {
            const result = await authAPI.login(formData.email, formData.password);
            // result contains { user, token }
            if (result.token) {
              setAuthToken(result.token);
            }
            // Convert API user to local User type
            const user: User = {
              id: result.user.id || result.user._id,
              name: result.user.name,
              email: result.user.email,
              phoneNumber: result.user.phoneNumber,
              role: result.user.role as UserRole,
              userSettingsId: result.user.userSettingsId,
              userSettings: result.user.userSettings, // Include UserSettings from API response
              // accountId: result.user.accountId, // Include accountId from API response (for backward compatibility)
              isActive: result.user.isActive !== false,
              isApproved: result.user.isApproved || false,
              createdAt: result.user.createdAt || new Date().toISOString().split('T')[0],
              preferredLanguage: result.user.preferredLanguage || 'he',
              googleCalendarLinked: result.user.googleCalendarLinked || false
            };
            onLogin(user, result.token);
          } catch (error: any) {
            console.error('Login error:', error);
            const errorMessage = error?.message || 'פרטי התחברות שגויים';
            alert(errorMessage);
          }
        } else if (method === 'phone') {
          // Phone login - send OTP first (handled in step 2)
          // Login uses ID number, not phone number
          if (!formData.idNumber) {
            alert('אנא הזן תעודת זהות');
            setLoading(false);
            return;
          }
          
          try {
            if (otpMethod === 'email') {
              console.log('📧 [Frontend] Starting email OTP send - Login mode');
              console.log('📧 [Frontend] ID Number:', formData.idNumber);
              console.log('📧 [Frontend] Mode: login');
              
              const result = await authAPI.sendEmailOTP(formData.idNumber, 'login');
              
              console.log('📧 [Frontend] Email OTP send successful:', result);
              setStep(2);
            } else {
              console.log('📱 [Frontend] Starting phone OTP send - Login mode');
              console.log('📱 [Frontend] ID Number:', formData.idNumber);
              console.log('📱 [Frontend] Mode: login');
              
              const result = await authAPI.sendPhoneOTP(formData.idNumber, 'login', otpMethod);
              
              console.log('📱 [Frontend] OTP send successful:', result);
              setStep(2);
            }
          } catch (error: any) {
            console.error('❌ [Frontend] Error sending OTP:', error);
            console.error('❌ [Frontend] Error message:', error?.message);
            console.error('❌ [Frontend] Error stack:', error?.stack);
            alert(error?.message || 'שגיאה בשליחת קוד אימות');
          } finally {
            setLoading(false);
          }
        }
      } else {
        // Registration
        if (method === 'google') {
          // Google OAuth is handled via button click and callback
          // The button triggers handleGoogleAuth automatically
          setLoading(false);
          return;
        }

        if (method === 'phone') {
          if (!formData.idNumber || !formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password) {
            alert('אנא מלא את כל השדות הנדרשים: תעודת זהות, שם פרטי, שם משפחה, אימייל, טלפון, וסיסמה');
            setLoading(false);
            return;
          }
          
          try {
            if (otpMethod === 'email') {
              console.log('📧 [Frontend] Starting email OTP send - Registration mode');
              console.log('📧 [Frontend] Email:', formData.email);
              console.log('📧 [Frontend] Mode: register');
              console.log('📧 [Frontend] User Data:', {
                idNumber: formData.idNumber,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email
              });
              
              const result = await authAPI.sendEmailOTP(formData.email, 'register');
              
              console.log('📧 [Frontend] Email OTP send successful:', result);
              setStep(2);
            } else {
              console.log('📱 [Frontend] Starting phone OTP send - Registration mode');
              console.log('📱 [Frontend] Phone:', formData.phone);
              console.log('📱 [Frontend] Mode: register');
              console.log('📱 [Frontend] User Data:', {
                idNumber: formData.idNumber,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email
              });
              
              const result = await authAPI.sendPhoneOTP(formData.phone, 'register', otpMethod);
              
              console.log('📱 [Frontend] OTP send successful:', result);
              setStep(2);
            }
          } catch (error: any) {
            console.error('❌ [Frontend] Error sending OTP:', error);
            console.error('❌ [Frontend] Error message:', error?.message);
            console.error('❌ [Frontend] Error stack:', error?.stack);
            alert(error?.message || 'שגיאה בשליחת קוד אימות');
          } finally {
            setLoading(false);
          }
          return;
        }

        if (!formData.name || !formData.email || !formData.password) {
          alert('אנא מלא את כל השדות הנדרשים');
          setLoading(false);
          return;
        }

        try {
          const result = await authAPI.register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phoneNumber: formData.phone,
            role: formData.role,
          });
          
          if (result.token) {
            setAuthToken(result.token);
          }
          
          const newUser: User = {
            id: result.user.id || result.user._id,
            name: result.user.name,
            email: result.user.email,
            phoneNumber: result.user.phoneNumber,
            role: result.user.role as UserRole,
            userSettingsId: result.user.userSettingsId,
            userSettings: result.user.userSettings, // Include UserSettings from API response
            isActive: result.user.isActive !== false,
            isApproved: result.user.isApproved || false,
            createdAt: result.user.createdAt || new Date().toISOString().split('T')[0],
            preferredLanguage: result.user.preferredLanguage || 'he',
            googleCalendarLinked: result.user.googleCalendarLinked || false
          };
          onRegister(newUser);
        } catch (error: any) {
          alert(error.message || 'שגיאה בהרשמה');
        }
      }
    } catch (error: any) {
      alert(error.message || 'אירעה שגיאה');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (m: 'phone' | 'google' | 'email') => {
    setMethod(m);
    setStep(1);
    setOtpCode(['', '', '', '', '']); // Reset OTP when changing method (5 digits)
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        <div className="p-10 flex-1">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-3xl font-black rotate-3 shadow-xl">Z</div>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
              {mode === 'login' ? 'ברוך השב' : 'הצטרפות ל-ZimmerPro'}
            </h1>
            <p className="text-slate-400 text-sm font-medium">המערכת המתקדמת ביותר לניהול צימרים ומתחמי אירוח</p>
          </div>

          {/* Methods Picker */}
          {step === 1 && (
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-8">
              {mode === 'login' && (
                <button 
                  onClick={() => handleMethodChange('email')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${method === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >אימייל</button>
              )}
              <button 
                onClick={() => handleMethodChange('phone')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${method === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >תעודת זהות</button>
              <button 
                onClick={() => handleMethodChange('google')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${method === 'google' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >גוגל</button>
            </div>
          )}

          <div className="space-y-4">
            {method === 'google' ? (
              <div className="space-y-4">
                <div ref={googleButtonRef} className="w-full flex justify-center min-h-[42px]"></div>
                {/* Fallback button in case Google button doesn't render or CLIENT_ID not set */}
                {!loading && (showFallbackButton || (googleButtonRef.current && !googleButtonRef.current.hasChildNodes())) && (
                  <button
                    onClick={() => {
                      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
                      if (!googleClientId) {
                        alert('VITE_GOOGLE_CLIENT_ID לא מוגדר. אנא הוסף אותו לקובץ .env.local ב-root של הפרויקט.\n\nראה הוראות: צריך להוסיף VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com');
                        return;
                      }
                      
                      // Manually trigger Google sign-in
                      if ((window as any).google?.accounts?.id) {
                        (window as any).google.accounts.oauth2.initTokenClient({
                          client_id: googleClientId,
                          scope: 'email profile',
                          callback: async (response: any) => {
                            if (response.access_token) {
                              alert('אימות Google זמין דרך הכפתור של Google. אנא השתמש בכפתור מעל.');
                            }
                          }
                        }).requestAccessToken();
                      } else {
                        alert('Google Identity Services לא נטען. אנא רענן את הדף או השתמש באימייל וסיסמה.');
                      }
                    }}
                    disabled={loading}
                    className="w-full bg-white border-2 border-slate-200 hover:border-slate-900 text-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                  >
                    <Chrome size={20} className="text-blue-500" />
                    {mode === 'login' ? 'התחברות עם Google' : 'הרשמה עם Google'}
                  </button>
                )}
                {loading && (
                  <div className="text-center py-2">
                    <Loader2 size={20} className="animate-spin text-slate-400 mx-auto" />
                  </div>
                )}
                {mode === 'register' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סוג פעילות מבוקש</label>
                    <select 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                    >
                      <option value={UserRole.ZIMMER_OWNER}>בעל צימר בודד</option>
                      <option value={UserRole.COMPLEX_OWNER}>בעל מתחם נופש</option>
                    </select>
                  </div>
                )}
              </div>
            ) : step === 2 ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {mode === 'login' 
                      ? otpMethod === 'email'
                        ? `קוד אימות נשלח באימייל לאימייל המשויך לתעודת זהות ${formData.idNumber}`
                        : `קוד אימות ${otpMethod === 'sms' ? 'נשלח ב-SMS' : 'נשלח בשיחה קולית'} למספר הטלפון המשויך לתעודת זהות ${formData.idNumber}`
                      : otpMethod === 'email'
                        ? `קוד אימות נשלח באימייל ל-${formData.email}`
                        : `קוד אימות ${otpMethod === 'sms' ? 'נשלח ב-SMS' : 'נשלח בשיחה קולית'} ל-${formData.phone}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    אנא הזן את 5 הספרות שקיבלת {otpMethod === 'email' ? 'באימייל' : otpMethod === 'sms' ? 'ב-SMS' : 'בשיחה הקולית'}
                  </p>
                </div>
                <div className="flex justify-center gap-3" dir="ltr">
                  {[0,1,2,3,4].map(i => (
                    <input 
                      key={i}
                      type="text" 
                      inputMode="numeric"
                      maxLength={1}
                      value={otpCode[i]}
                      onChange={(e) => {
                        const newOtp = [...otpCode];
                        newOtp[i] = e.target.value.replace(/[^0-9]/g, '');
                        setOtpCode(newOtp);
                        // Auto-focus next input
                        if (e.target.value && i < 4) {
                          const nextInput = document.querySelector(`input[data-otp-index="${i + 1}"]`) as HTMLInputElement;
                          nextInput?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otpCode[i] && i > 0) {
                          const prevInput = document.querySelector(`input[data-otp-index="${i - 1}"]`) as HTMLInputElement;
                          prevInput?.focus();
                        }
                      }}
                      data-otp-index={i}
                      className="w-12 h-14 bg-slate-50 border-2 border-slate-100 rounded-xl text-center text-xl font-black focus:border-slate-900 outline-none"
                    />
                  ))}
                </div>
                <button 
                  onClick={async () => {
                    const otp = otpCode.join('');
                    if (otp.length !== 5) {
                      alert('אנא הזן קוד אימות בן 5 ספרות');
                      return;
                    }
                    
                    setLoading(true);
                    try {
                      if (mode === 'login') {
                        const result = otpMethod === 'email'
                          ? await authAPI.verifyEmailOTP(formData.idNumber, otp)
                          : await authAPI.verifyPhoneOTP(formData.idNumber, otp);
                        if (result.token) {
                          setAuthToken(result.token);
                        }
                        const user: User = {
                          id: result.user.id || result.user._id,
                          name: result.user.name,
                          email: result.user.email,
                          phoneNumber: result.user.phoneNumber,
                          role: result.user.role as UserRole,
                          userSettingsId: result.user.userSettingsId,
                          userSettings: result.user.userSettings, // Include UserSettings from API response
                          isActive: result.user.isActive !== false,
                          isApproved: result.user.isApproved || false,
                          createdAt: result.user.createdAt || new Date().toISOString().split('T')[0],
                          preferredLanguage: result.user.preferredLanguage || 'he',
                          googleCalendarLinked: result.user.googleCalendarLinked || false
                        };
                        onLogin(user, result.token);
                      } else {
                        // Registration - send all fields
                        const result = otpMethod === 'email'
                          ? await authAPI.verifyEmailOTP(formData.email, otp, {
                              idNumber: formData.idNumber,
                              firstName: formData.firstName,
                              lastName: formData.lastName,
                              name: `${formData.firstName} ${formData.lastName}`,
                              email: formData.email,
                              phoneNumber: formData.phone,
                              password: formData.password,
                              role: formData.role
                            })
                          : await authAPI.verifyPhoneOTP(formData.phone, otp, {
                              idNumber: formData.idNumber,
                              firstName: formData.firstName,
                              lastName: formData.lastName,
                              name: `${formData.firstName} ${formData.lastName}`,
                              email: formData.email,
                          password: formData.password,
                          phoneNumber: formData.phone,
                          role: 'client' // Register as client
                        });
                        if (result.token) {
                          setAuthToken(result.token);
                        }
                        const newUser: User = {
                          id: result.user.id || result.user._id,
                          name: result.user.name,
                          email: result.user.email,
                          phoneNumber: result.user.phoneNumber,
                          role: result.user.role as UserRole,
                          userSettingsId: result.user.userSettingsId,
                          userSettings: result.user.userSettings, // Include UserSettings from API response
                          isActive: result.user.isActive !== false,
                          isApproved: result.user.isApproved || false,
                          createdAt: result.user.createdAt || new Date().toISOString().split('T')[0],
                          preferredLanguage: result.user.preferredLanguage || 'he',
                          googleCalendarLinked: result.user.googleCalendarLinked || false
                        };
                        onRegister(newUser);
                      }
                    } catch (error: any) {
                      console.error('OTP verification error:', error);
                      alert(error?.message || 'קוד אימות שגוי או פג תוקף');
                      setOtpCode(['', '', '', '', '']);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : (mode === 'login' ? 'אמת והתחבר' : 'אמת והירשם')}
                </button>
                <button 
                  onClick={() => setStep(1)}
                  className="w-full text-slate-400 text-xs font-bold py-2"
                >
                  חזרה לעדכון מספר
                </button>
              </div>
            ) : (
              <>
                {mode === 'login' ? (
                  <>
                    {method === 'phone' ? (
                      <>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תעודת זהות</label>
                          <div className="relative">
                            <UserCircle size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              inputMode="numeric"
                              placeholder="123456789"
                              maxLength={9}
                              value={formData.idNumber}
                              onChange={e => setFormData({...formData, idNumber: e.target.value.replace(/[^0-9]/g, '')})}
                              className="w-full bg-slate-50 border-none rounded-2xl pr-14 pl-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">אופן קבלת הקוד</label>
                          <div className="flex gap-2 bg-slate-50 rounded-2xl p-2">
                            <button
                              type="button"
                              onClick={() => setOtpMethod('sms')}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                otpMethod === 'sms' 
                                  ? 'bg-white text-slate-900 shadow-sm' 
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              📱 SMS
                            </button>
                            <button
                              type="button"
                              onClick={() => setOtpMethod('voice')}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                otpMethod === 'voice' 
                                  ? 'bg-white text-slate-900 shadow-sm' 
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              📞 שיחה
                            </button>
                            <button
                              type="button"
                              onClick={() => setOtpMethod('email')}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                otpMethod === 'email' 
                                  ? 'bg-white text-slate-900 shadow-sm' 
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              📧 מייל
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 mt-2 mr-2">
                            הקוד ישלח {otpMethod === 'email' ? 'באימייל' : otpMethod === 'sms' ? 'ב-SMS' : 'בשיחה קולית'} {otpMethod === 'email' ? 'לאימייל' : 'למספר הטלפון'} המשויך לתעודת הזהות שלך במערכת
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">אימייל</label>
                          <input 
                            type="email" 
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סיסמה</label>
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                          />
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  // Registration: All fields from image
                  <>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תעודת זהות</label>
                          <input 
                            type="text" 
                            inputMode="numeric"
                            placeholder="123456789"
                            maxLength={9}
                            value={formData.idNumber}
                            onChange={e => setFormData({...formData, idNumber: e.target.value.replace(/[^0-9]/g, '')})}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">שם פרטי</label>
                          <input 
                            type="text" 
                            placeholder="ישראל"
                            value={formData.firstName}
                            onChange={e => setFormData({...formData, firstName: e.target.value})}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">שם משפחה</label>
                          <input 
                            type="text" 
                            placeholder="ישראלי"
                            value={formData.lastName}
                            onChange={e => setFormData({...formData, lastName: e.target.value})}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">אימייל</label>
                          <input 
                            type="email" 
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">טלפון נייד</label>
                          <div className="relative">
                            <Smartphone size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="tel" 
                              placeholder="050-000-0000"
                              value={formData.phone}
                              onChange={e => setFormData({...formData, phone: e.target.value})}
                              className="w-full bg-slate-50 border-none rounded-2xl pr-14 pl-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">אופן קבלת הקוד</label>
                          <div className="flex gap-2 bg-slate-50 rounded-2xl p-2">
                            <button
                              type="button"
                              onClick={() => setOtpMethod('sms')}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                otpMethod === 'sms' 
                                  ? 'bg-white text-slate-900 shadow-sm' 
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              📱 SMS
                            </button>
                            <button
                              type="button"
                              onClick={() => setOtpMethod('voice')}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                otpMethod === 'voice' 
                                  ? 'bg-white text-slate-900 shadow-sm' 
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              📞 שיחה
                            </button>
                            <button
                              type="button"
                              onClick={() => setOtpMethod('email')}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                otpMethod === 'email' 
                                  ? 'bg-white text-slate-900 shadow-sm' 
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              📧 מייל
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סיסמה</label>
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                          />
                          <p className="text-xs text-slate-400 mt-1 mr-2">(לפחות 8 תווים, אותיות ומספרים)</p>
                        </div>
                  </>
                )}

                {mode === 'register' && method === 'phone' && (
                  <div>
                    <p className="text-xs text-slate-500 mt-4 text-center">
                      עם המשך תשלח קוד אימות למספר הטלפון שבו הזנת
                    </p>
                  </div>
                )}

                <button 
                  onClick={handleAction}
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 mt-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : (mode === 'login' ? 'כניסה למערכת' : method === 'phone' ? 'המשך לאימות טלפון' : 'הרשמה והתחלה')}
                  <ArrowRight size={18} className="rotate-180" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-sm font-medium text-slate-500">
            {mode === 'login' ? 'עדיין לא רשום?' : 'כבר יש לך חשבון?'}
            <button 
              onClick={() => {
                const newMode = mode === 'login' ? 'register' : 'login';
                setMode(newMode);
                if (newMode === 'register' && method === 'email') {
                  setMethod('phone');
                }
              }}
              className="text-slate-900 font-black mr-2 underline underline-offset-4"
            >
              {mode === 'login' ? 'צור חשבון חדש' : 'התחבר כאן'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
