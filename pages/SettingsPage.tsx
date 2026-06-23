
import React, { useState, useEffect } from 'react';
import { Server, Database, Shield, Globe, Key, Terminal, Info, Trash2, RefreshCw, Calendar as CalendarIcon, CheckCircle2, AlertTriangle, MessageSquare, Share2 } from 'lucide-react';
import { AppState } from '../types';
import { settingsAPI, authAPI } from '../api';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
}

const SettingsPage: React.FC<Props> = ({ db, setDb }) => {
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({ units: 0, bookings: 0 });
  const user = db.currentUser;

  const [whatsappConfig, setWhatsappConfig] = useState({
    accessToken: 'EAANL...',
    phoneNumberId: '1092837465',
    verifyToken: 'ZIMMER_PRO_2024'
  });

  // Load statistics and WhatsApp config on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const stats = await settingsAPI.getStatistics();
      setStatistics(stats);
      
      try {
        const whatsapp = await settingsAPI.getWhatsAppConfig();
        if (whatsapp) {
          setWhatsappConfig(whatsapp);
        }
      } catch (err) {
        // WhatsApp config might not exist yet, that's OK
        console.log('WhatsApp config not found, using defaults');
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const serverDetails = {
    name: "My Server",
    // host: "103.95.119.188",
    protocol: "sftp",
    port: 22,
    username: "root",
    remotePath: "/var/www/zimmersAi/"
  };

  // const handleResetData = async () => {
  //   if (confirm('האם אתה בטוח שברצונך לאפס את כל הנתונים? פעולה זו תמחוק את כל הצימרים וההזמנות מהמסד נתונים MongoDB. פעולה זו אינה הפיכה!')) {
  //     try {
  //       setLoading(true);
  //       await settingsAPI.resetData();
  //       alert('הנתונים אופסו בהצלחה');
  //       await loadData(); // Reload statistics
  //     } catch (err: any) {
  //       alert('שגיאה באיפוס הנתונים: ' + (err.message || 'Unknown error'));
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  // };

  const handleConnectGoogle = async () => {
    try {
      setIsLinkingGoogle(true);
      // Get OAuth URL and redirect user to Google
      const result = await settingsAPI.getGoogleCalendarAuthUrl();
      if (result.authUrl) {
        // Redirect to Google OAuth
        window.location.href = result.authUrl;
      }
    } catch (err: any) {
      alert('שגיאה בחיבור לגוגל: ' + (err.message || 'Unknown error'));
      setIsLinkingGoogle(false);
    }
  };

  // Check if we're returning from Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('googleCalendarConnected');
    const error = params.get('googleCalendarError');
    
    if (connected === 'true') {
      // Reload user to get updated data from server
      const reloadUser = async () => {
        try {
          const updatedUser = await authAPI.getMe();
          if (updatedUser.user) {
            setDb({ ...db, currentUser: updatedUser.user });
          }
        } catch (err) {
          console.error('Error reloading user:', err);
        }
      };
      reloadUser();
      alert('יומן גוגל חובר בהצלחה! האירועים יסתנכרנו אוטומטית.');
      // Remove query params from URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      alert('שגיאה בחיבור ליומן גוגל: ' + decodeURIComponent(error));
      // Remove query params from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSaveWhatsApp = async () => {
    try {
      setLoading(true);
      await settingsAPI.updateWhatsAppConfig(whatsappConfig);
      alert('הגדרות WhatsApp נשמרו בהצלחה');
    } catch (err: any) {
      alert('שגיאה בשמירת הגדרות WhatsApp: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">הגדרות מערכת</h2>
          <p className="text-slate-500 text-sm">אינטגרציות, התראות ופרטי חשבון.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 rounded-xl transition-all shadow-sm"
          title="רענן סנכרון"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Google Calendar Integration Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
           <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <CalendarIcon size={20} />
              </div>
              סנכרון ליומן גוגל (Google Calendar)
            </h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user?.googleCalendarLinked ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
              {user?.googleCalendarLinked ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="space-y-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <img src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" className="w-6 h-6" alt="Google Calendar" />
                  </div>
                  <div className="flex-1">
                     <p className="text-sm font-black text-slate-800">חשבון מקושר: {user?.email}</p>
                     <p className="text-xs text-slate-500 font-medium mt-1">
                       כדי לראות הזמנות ביומן הפרטי שלך, עליך לאשר את הגישה ליומן דרך חשבון ה-Google שלך.
                     </p>
                  </div>
               </div>
            </div>

            <div className="space-y-3">
               {user?.isApproved ? (
                 <div className="flex flex-col gap-3">
                    {!user?.googleCalendarLinked ? (
                      <button 
                        onClick={handleConnectGoogle}
                        disabled={isLinkingGoogle}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                      >
                        {isLinkingGoogle ? <RefreshCw size={18} className="animate-spin" /> : <CalendarIcon size={18} />}
                        סנכרן את {user.email} עכשיו
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <CheckCircle2 size={16} />
                        <span className="text-[10px] font-black uppercase">הסנכרון האוטומטי מופעל</span>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed font-bold">
                      החשבון שלך בסטטוס "ממתין לאישור". סנכרון לגוגל יתאפשר רק לאחר אישור המנהל.
                    </p>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* WhatsApp API Configuration Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
           <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <MessageSquare size={20} />
              </div>
              הגדרות WhatsApp API
            </h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">Phone Number ID</label>
              <input 
                type="text" 
                value={whatsappConfig.phoneNumberId}
                onChange={e => setWhatsappConfig({...whatsappConfig, phoneNumberId: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">Permanent Access Token</label>
              <input 
                type="password" 
                value={whatsappConfig.accessToken}
                onChange={e => setWhatsappConfig({...whatsappConfig, accessToken: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold font-mono"
              />
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
              <Share2 size={16} className="text-emerald-600" />
              <p className="text-[10px] font-bold text-emerald-700 leading-relaxed">
                נתונים אלו נחוצים לשרת ה-Backend כדי לשלוח הודעות בשמך. עיין בדף ה-"חיבור לווצאפ" להסבר נוסף.
              </p>
            </div>
            <button 
              onClick={handleSaveWhatsApp}
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : 'שמור הגדרות'}
            </button>
          </div>
        </div>

        {/* Server Details Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Server size={20} />
              </div>
              פרטי שרת (Backend)
            </h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
              ONLINE
            </span>
          </div>

          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <span className="text-sm text-slate-400 font-medium tracking-tight">IP Address</span>
              {/* <span className="text-sm font-mono text-slate-800 font-black">{serverDetails.host}</span> */}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <span className="text-sm text-slate-400 font-medium tracking-tight">SSH Protocol</span>
              <span className="text-sm font-mono text-slate-800 font-black uppercase">{serverDetails.protocol}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <span className="text-sm text-slate-400 font-medium tracking-tight">Remote User</span>
              <span className="text-sm font-mono text-indigo-600 font-black">{serverDetails.username}</span>
            </div>
          </div>
          
          <div className="mt-8">
             <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
               <Terminal size={18} />
               SSH Console Access
             </button>
          </div>
        </div>

        {/* Database & System Info */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-xl">
                <Database size={20} />
              </div>
              ניהול נתונים מקומי
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">צימרים</p>
                <p className="text-3xl font-black text-slate-800">{loading ? '...' : statistics.units}</p>
             </div>
             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">הזמנות</p>
                <p className="text-3xl font-black text-slate-800">{loading ? '...' : statistics.bookings}</p>
             </div>
          </div>

          <div className="space-y-3">
             {/* <button 
              onClick={handleResetData}
              disabled={loading}
              className="w-full bg-white border border-rose-200 text-rose-500 py-3.5 rounded-2xl font-black text-xs hover:bg-rose-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
             >
               {loading ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
               איפוס בסיס נתונים (MongoDB)
             </button> */}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-2xl">
           <div>
             <h4 className="text-xl font-black mb-2 flex items-center gap-2">
               <Info size={24} className="text-indigo-400" />
               מעבר ל-Production
             </h4>
             <p className="text-slate-400 text-sm leading-relaxed font-medium">
               כרגע המערכת פועלת במצב סימולציה. סנכרון מלא ליומן גוגל דורש הפעלת Webhooks בשרת ה-Node.js שלך.
             </p>
           </div>
           <button className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-indigo-900/40">
              הפעל סנכרון שרת (SYNC PRO)
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
