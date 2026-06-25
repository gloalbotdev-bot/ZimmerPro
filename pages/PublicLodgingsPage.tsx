import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, User, UserRole } from '../types';
import { translations, Language } from '../translations';
import { authAPI, setAuthToken, getAuthToken } from '../api';
import { getDefaultAuthMethod, isAuthMethodEnabled, showAuthMethodPicker } from '../authMethods';
import UnitsPage from './UnitsPage';
import BookingsPage from './BookingsPage';
import { 
  Smartphone, Chrome, LogOut, Loader2, 
  X, AlertCircle
} from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  onLogin: (user: User, token?: string) => void;
}

const PublicLodgingsPage: React.FC<Props> = ({ db, setDb, onLogin }) => {
  const t = translations['he']; // Always Hebrew for public page
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'content'>('login');
  const [authMethod, setAuthMethod] = useState<'phone' | 'google'>(getDefaultAuthMethod() as 'phone' | 'google');
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '']);
  const [activeView, setActiveView] = useState<'units' | 'bookings'>('units');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    idNumber: '',
    otp: '',
    phone: ''
  });

  const [error, setError] = useState<string | null>(null);

  const user = db.currentUser;
  const isClient = user?.role === UserRole.CLIENT || user?.role === UserRole.CUSTOMER;

  // Handle Google OAuth
  const handleGoogleAuth = useCallback(async (googleToken: string) => {
    setLoading(true);
    try {
      setError(null);
      const result = await authAPI.googleLogin(googleToken);
      if (result.token) {
        setAuthToken(result.token);
      }
      
      const userData: User = {
        id: result.user.id || result.user._id,
        name: result.user.name,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber,
        role: result.user.role as UserRole,
        isActive: result.user.isActive !== false,
        isApproved: result.user.isApproved || false,
        createdAt: result.user.createdAt || new Date().toISOString().split('T')[0],
        preferredLanguage: result.user.preferredLanguage || 'he',
        googleCalendarLinked: result.user.googleCalendarLinked || false
      };

      onLogin(userData, result.token);
      setAuthStep('content');
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err?.message || 'שגיאה בהתחברות עם Google. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  }, [onLogin]);

  // Load Google Identity Services
  useEffect(() => {
    if (authStep === 'login' && authMethod === 'google') {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
      
      if (!googleClientId) {
        console.warn('Google Client ID not configured');
        return;
      }

      const loadGoogleScript = () => {
        // Check if script already loaded
        if ((window as any).google?.accounts?.id) {
          initGoogleButton();
          return;
        }

        // Load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          initGoogleButton();
        };
        script.onerror = () => {
          setError('שגיאה בטעינת Google. אנא נסה שוב.');
        };
        document.body.appendChild(script);

        return () => {
          // Cleanup
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };
      };

      const initGoogleButton = () => {
        if (!googleButtonRef.current) return;

        googleButtonRef.current.innerHTML = '';

        try {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response.credential) {
                await handleGoogleAuth(response.credential);
              }
            }
          });

          (window as any).google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: googleButtonRef.current.offsetWidth || 300,
            locale: 'he'
          });
        } catch (error) {
          console.error('Error initializing Google button:', error);
          setError('שגיאה בהתחברות עם Google');
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
    }
  }, [authStep, authMethod, handleGoogleAuth]);

  // Check if user is already logged in
  useEffect(() => {
    const token = getAuthToken();
    if (token && user) {
      setAuthStep('content');
    } else if (token && !user) {
      // Try to restore user from token
      authAPI.getMe()
        .then((userData) => {
          setDb((prevDb) => ({ ...prevDb, currentUser: userData }));
          setAuthStep('content');
        })
        .catch(() => {
          setAuthToken(null);
        });
    }
  }, []);

  const handlePhoneLogin = async () => {
    if (!formData.idNumber) {
      setError('אנא הזן תעודת זהות');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // await authAPI.sendPhoneOTP(formData.idNumber, 'login', 'sms');
      // Send OTP via voice call instead of SMS
      await authAPI.sendPhoneOTP(formData.idNumber, 'login', 'voice');
      setOtpStep(2);
    } catch (err: any) {
      setError(err.message || 'שגיאה בשליחת קוד אימות');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async () => {
    const otp = otpCode.join('');
    if (otp.length !== 5) {
      setError('אנא הזן קוד אימות בן 5 ספרות');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await authAPI.verifyPhoneOTP(formData.idNumber, otp);
      
      if (result.token) {
        setAuthToken(result.token);
      }

      const userData: User = {
        id: result.user.id || result.user._id,
        name: result.user.name,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber,
        role: result.user.role as UserRole,
        isActive: result.user.isActive !== false,
        isApproved: result.user.isApproved || false,
        createdAt: result.user.createdAt || new Date().toISOString().split('T')[0],
        preferredLanguage: result.user.preferredLanguage || 'he'
      };

      onLogin(userData, result.token);
      setAuthStep('content');
    } catch (err: any) {
      setError(err.message || 'קוד אימות שגוי');
    } finally {
      setLoading(false);
    }
  };

  // Google login is handled via the button rendered by Google Identity Services
  // The button triggers handleGoogleAuth automatically when clicked

  const handleLogout = () => {
    setAuthToken(null);
    setDb({ ...db, currentUser: undefined });
    setAuthStep('login');
    setFormData({ idNumber: '', otp: '', phone: '' });
    setOtpCode(['', '', '', '', '']);
    setOtpStep(1);
  };

  // If not logged in, show auth form
  if (authStep === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl sm:rounded-[3rem] shadow-2xl border border-white/20 w-full max-w-md p-8 sm:p-10 space-y-6 sm:space-y-8 transition-all duration-300">
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-indigo-500/30 rotate-3">
                Z
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              ניהול מערכת צימרים
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-semibold">התחברות למערכת</p>
          </div>

          {error && (
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300">
              <AlertCircle size={18} className="text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {otpStep === 1 ? (
            <div className="space-y-5">
              {/* Method Toggle */}
              {showAuthMethodPicker() && (
              <div className="flex gap-2 p-1.5 bg-gradient-to-r from-slate-100 to-slate-50 rounded-2xl shadow-inner">
                {isAuthMethodEnabled('phone') && (
                <button
                  onClick={() => setAuthMethod('phone')}
                  className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 ${
                    authMethod === 'phone'
                      ? 'bg-white text-slate-900 shadow-lg scale-105'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Smartphone size={16} className={authMethod === 'phone' ? 'text-indigo-600' : ''} />
                    תעודת זהות
                  </div>
                </button>
                )}
                {isAuthMethodEnabled('google') && (
                <button
                  onClick={() => setAuthMethod('google')}
                  className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 ${
                    authMethod === 'google'
                      ? 'bg-white text-slate-900 shadow-lg scale-105'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Chrome size={16} className={authMethod === 'google' ? 'text-blue-500' : ''} />
                    Google
                  </div>
                </button>
                )}
              </div>
              )}

              {authMethod === 'phone' ? (
                <>
                  <div className="space-y-2">
                    <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider mr-2">
                      תעודת זהות
                    </label>
                    <div className="relative">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a4.001 4.001 0 00-8 0c0 1.1.9 2 2 2h2.17M13 18h5a2 2 0 002-2v-5a2 2 0 00-2-2h-2.17" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={9}
                        value={formData.idNumber}
                        onChange={(e) => setFormData({ ...formData, idNumber: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="הזן תעודת זהות"
                        className="w-full bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200 rounded-2xl px-5 pr-12 py-4 text-base sm:text-lg font-black text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePhoneLogin}
                    disabled={loading || !formData.idNumber}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm sm:text-base">מתקשר לשליחת קוד אימות...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone size={20} />
                        <span className="text-sm sm:text-base">שלח קוד אימות בשיחה</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center w-full p-2">
                    <div ref={googleButtonRef} id="google-signin-button" className="w-full flex justify-center min-h-[50px]"></div>
                  </div>
                  
                  {/* Fallback Google button for mobile */}
                  {!loading && (!googleButtonRef.current || !googleButtonRef.current.hasChildNodes()) && (
                    <button
                      onClick={async () => {
                        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
                        if (!googleClientId) {
                          setError('VITE_GOOGLE_CLIENT_ID לא מוגדר. אנא הוסף אותו לקובץ .env.local');
                          return;
                        }
                        
                        if ((window as any).google?.accounts?.id) {
                          try {
                            (window as any).google.accounts.id.prompt();
                          } catch (error) {
                            console.error('Error prompting Google sign-in:', error);
                            setError('שגיאה בהתחברות עם Google. אנא נסה שוב.');
                          }
                        } else {
                          setError('Google Identity Services לא נטען. אנא רענן את הדף.');
                        }
                      }}
                      disabled={loading}
                      className="w-full bg-white border-2 border-slate-300 hover:border-blue-500 text-slate-700 py-4 sm:py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 text-sm sm:text-base shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Chrome size={20} className="text-blue-500" />
                      התחברות עם Google
                    </button>
                  )}
                  {loading && (
                    <div className="text-center py-4">
                      <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-slate-900">קוד אימות נשלח</h3>
                <p className="text-xs sm:text-sm text-slate-500">הזן את 5 הספרות שקיבלת בשיחה</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-slate-700 mb-3 text-center">קוד אימות (5 ספרות)</label>
                <div className="flex gap-3 sm:gap-4 justify-center">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const newCode = [...otpCode];
                        newCode[index] = e.target.value.replace(/[^0-9]/g, '');
                        setOtpCode(newCode);
                        // Auto-focus next input
                        if (e.target.value && index < 4) {
                          const nextInput = document.getElementById(`otp-${index + 1}`);
                          nextInput?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
                          const prevInput = document.getElementById(`otp-${index - 1}`);
                          prevInput?.focus();
                        }
                      }}
                      id={`otp-${index}`}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-black border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gradient-to-br from-slate-50 to-white shadow-sm hover:shadow-md"
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleOTPVerify}
                disabled={loading || otpCode.join('').length !== 5}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm sm:text-base">מאמת...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm sm:text-base">אמת קוד אימות</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setOtpStep(1);
                  setOtpCode(['', '', '', '', '']);
                  setError(null);
                }}
                className="w-full text-slate-500 py-3 font-bold hover:text-slate-900 transition-all text-sm sm:text-base hover:bg-slate-50 rounded-xl"
              >
                ← חזור
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show content after login
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-md">
            Z
          </div>
          <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent truncate">
            ניהול מערכת צימרים
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 truncate max-w-[120px] sm:max-w-none">{user?.name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 sm:gap-2 px-4 sm:px-5 py-2.5 text-slate-600 hover:text-slate-900 font-bold transition-all rounded-xl hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 text-xs sm:text-sm border border-transparent hover:border-rose-200"
          >
            <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">התנתק</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      {!isClient && (
        <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/50 px-4 sm:px-6 overflow-x-auto shadow-sm">
          <div className="flex gap-1 min-w-max sm:min-w-0">
            <button
              onClick={() => setActiveView('units')}
              className={`px-5 sm:px-7 py-3 sm:py-4 font-black transition-all duration-300 text-sm sm:text-base whitespace-nowrap rounded-t-xl ${
                activeView === 'units'
                  ? 'bg-gradient-to-b from-indigo-50 to-white text-indigo-700 border-b-2 border-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              🏠 צימרים
            </button>
            <button
              onClick={() => setActiveView('bookings')}
              className={`px-5 sm:px-7 py-3 sm:py-4 font-black transition-all duration-300 text-sm sm:text-base whitespace-nowrap rounded-t-xl ${
                activeView === 'bookings'
                  ? 'bg-gradient-to-b from-indigo-50 to-white text-indigo-700 border-b-2 border-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              📅 הזמנות
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {error && (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-200 text-rose-700 px-5 py-4 rounded-2xl m-4 sm:m-6 flex items-center gap-3 shadow-lg transition-all duration-300">
            <AlertCircle size={20} className="text-rose-500 flex-shrink-0" />
            <span className="font-bold text-sm sm:text-base">{error}</span>
          </div>
        )}

        {isClient ? (
          <BookingsPage db={db} setDb={setDb} lang="he" isReadOnly={true} />
        ) : activeView === 'units' ? (
          <UnitsPage db={db} setDb={setDb} lang="he" />
        ) : (
          <BookingsPage db={db} setDb={setDb} lang="he" isReadOnly={false} />
        )}
      </main>
    </div>
  );
};

export default PublicLodgingsPage;
