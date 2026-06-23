
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Search, 
  Users, 
  Puzzle, 
  Home, 
  ClipboardList, 
  UserCog, 
  CalendarDays,
  Menu,
  X,
  CloudUpload,
  RefreshCcw,
  Bell,
  Database,
  LogOut,
  Languages,
  Briefcase,
  Share2,
  Star,
  ArrowLeft
} from 'lucide-react';
import { AppState, User, UserRole } from './types';
import { translations, Language } from './translations';
import Dashboard from './pages/Dashboard';
import UnitsPage from './pages/UnitsPage';
import BookingsPage from './pages/BookingsPage';
import CalendarPage from './pages/CalendarPage';
import BotSimulator from './pages/BotSimulator';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import AccountsPage from './pages/AccountsPage';
import AuthPage from './pages/AuthPage';
import ContactsPage from './pages/ContactsPage';
import FacilitiesPage from './pages/FacilitiesPage';
import IntegrationsPage from './pages/IntegrationsPage';
import ReviewsPage from './pages/ReviewsPage';
import PublicLodgingsPage from './pages/PublicLodgingsPage';
import { getDB } from './db';
import { setAuthToken, usersAPI, authAPI, getAuthToken } from './api';

const App: React.FC = () => {
  const [db, setDb] = useState<AppState>(getDB());
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const [isPublicPage, setIsPublicPage] = useState(
    path === '/lodgings/new' || path === '/lodgings/new/' || path.startsWith('/lodgings/new')
  );

  const getInitialTab = () => {
    const user = db.currentUser;
    if (!user) return 'dashboard';
    const isAdmin = user.role === UserRole.ADMIN;
    if (!user.isApproved && !isAdmin) {
      return 'bookings';
    }
    return 'dashboard';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab()); 
  const [lang, setLang] = useState<Language>((db.currentUser?.preferredLanguage as Language) || 'he');

  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname;
      const isPublic = path === '/lodgings/new' || path === '/lodgings/new/' || path.startsWith('/lodgings/new');
      setIsPublicPage(isPublic);
    };
    
    checkPath();
    
    window.addEventListener('popstate', checkPath);
    window.addEventListener('pushstate', checkPath);
    window.addEventListener('replacestate', checkPath);
    
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      checkPath();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      checkPath();
    };
    
    return () => {
      window.removeEventListener('popstate', checkPath);
      window.removeEventListener('pushstate', checkPath);
      window.removeEventListener('replacestate', checkPath);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    const token = getAuthToken();
    if (token && !db.currentUser) {
      authAPI.getMe()
        .then((result) => {
          // Handle both { user } and direct user object
          const user = result.user || result;
          console.log('🔄 [App] Restored user from token:', {
            id: user.id,
            name: user.name,
            role: user.role,
            userSettingsId: user.userSettingsId,
            userSettings: user.userSettings
          });
          setDb((prevDb) => ({ ...prevDb, currentUser: user }));
          if (user.preferredLanguage) {
            setLang(user.preferredLanguage as Language);
          }
          const isAdmin = user.role === UserRole.ADMIN;
          if (!user.isApproved && !isAdmin) {
            setActiveTab('bookings');
          } else {
            setActiveTab('dashboard');
          }
        })
        .catch((err) => {
          // Token is invalid or expired, clear it
          console.error('Failed to restore user from token:', err);
          setAuthToken(null);
        });
    }
  }, []);

  useEffect(() => {
    const user = db.currentUser;
    if (!user) return;

    const isAdmin = user.role === UserRole.ADMIN;
    
    let validTabs: string[] = [];
    
    if (!user.isApproved && !isAdmin) {
      validTabs = ['bookings'];
    } else {
      validTabs = ['dashboard', 'bot_simulator', /* 'integrations', */ 'units', 'bookings', 'calendar', 'reviews', 'contacts', 'facilities'];
      
      if (user.role === UserRole.ADMIN || user.role === UserRole.COMPLEX_OWNER) {
        validTabs.push('accounts');
      }
      
      if (user.role === UserRole.ADMIN) {
        validTabs.push('users', 'settings');
      }
    }
    
    const isValidTab = validTabs.includes(activeTab);
    
    if (!isValidTab) {
      if (!user.isApproved && !isAdmin) {
        setActiveTab('bookings');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [db.currentUser?.isApproved, db.currentUser?.role, db.currentUser?.id, activeTab]);

  useEffect(() => {
    if (db.currentUser?.preferredLanguage) {
      setLang(db.currentUser.preferredLanguage as Language);
    }
  }, [db.currentUser?.preferredLanguage]);

  useEffect(() => {
    const currentUser = db.currentUser;
    if (currentUser?.id && currentUser.preferredLanguage !== lang) {
      usersAPI.update(currentUser.id, { preferredLanguage: lang })
        .then((updatedUser) => {
          setDb((prevDb) => ({
            ...prevDb,
            currentUser: updatedUser ? { ...prevDb.currentUser!, preferredLanguage: lang } : prevDb.currentUser
          }));
        })
        .catch((err) => {
          console.error('Failed to update language preference:', err);
        });
    }
  }, [lang]);

  const handleLogout = () => {
    setAuthToken(null);
    setDb({ ...db, currentUser: undefined, originalAdminUser: undefined });
  };

  const handleReturnToAdmin = () => {
    if (db.originalAdminUser) {
      setDb({
        ...db,
        currentUser: db.originalAdminUser,
        originalAdminUser: undefined
      });
      console.log('🔄 [App] Returned to admin view');
    }
  };

  const handleLogin = (user: User, token?: string) => {
    if (token) {
      setAuthToken(token);
    }
    setDb({ ...db, currentUser: user });
    if (user.preferredLanguage) {
      setLang(user.preferredLanguage as Language);
    }
    if (!user.isApproved && user.role !== UserRole.ADMIN) {
      setActiveTab('bookings');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleRegister = (user: User) => {
    const updatedUsers = [user, ...db.users];
    setDb({ ...db, users: updatedUsers, currentUser: user });
    setActiveTab('bookings');
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() =>     setIsDeploying(false), 1500);
  };

  if (isPublicPage) {
    return (
      <PublicLodgingsPage
        db={db}
        setDb={setDb}
        onLogin={handleLogin}
      />
    );
  }

  const getMenuItems = () => {
    const user = db.currentUser;
    if (!user) return [];

    const isAdmin = user.role === UserRole.ADMIN;
    
    if (user.role === UserRole.CLIENT || user.role === UserRole.CUSTOMER) {
      return [
        { id: 'bookings', label: t.bookings, icon: ClipboardList },
        { id: 'calendar', label: t.calendar, icon: CalendarDays },
      ];
    }
    
    if (!user.isApproved && !isAdmin) {
      return [{ id: 'bookings', label: t.bookings, icon: ClipboardList }];
    }

    const items = [
      { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
      { id: 'bot_simulator', label: t.bot_simulator, icon: Search },
      // { id: 'integrations', label: t.integrations, icon: Share2 },
      { id: 'units', label: t.units, icon: Home },
      { id: 'bookings', label: t.bookings, icon: ClipboardList },
      { id: 'calendar', label: t.calendar, icon: CalendarDays },
      { id: 'reviews', label: t.reviews, icon: Star },
      { id: 'contacts', label: t.contacts, icon: Users },
      { id: 'facilities', label: t.facilities, icon: Puzzle },
    ];

    if (user.role === UserRole.ADMIN || user.role === UserRole.COMPLEX_OWNER) {
      items.push({ id: 'accounts', label: t.accounts, icon: Briefcase });
    }

    if (user.role === UserRole.ADMIN) {
      items.push({ id: 'users', label: t.users, icon: UserCog });
      items.push({ id: 'settings', label: t.settings, icon: Database });
    }

    return items;
  };

  if (!db.currentUser) {
    return <AuthPage db={db} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const renderContent = () => {
    if (activeTab === 'dashboard') return <Dashboard db={db} lang={lang} />;
    if (activeTab === 'units') return <UnitsPage db={db} setDb={setDb} lang={lang} />;
    if (activeTab === 'bookings') return <BookingsPage db={db} setDb={setDb} lang={lang} />;
    if (activeTab === 'calendar') return <CalendarPage db={db} setDb={setDb} lang={lang} />;
    if (activeTab === 'bot_simulator') return <BotSimulator db={db} setDb={setDb} lang={lang} />;
    if (activeTab === 'integrations') return <IntegrationsPage db={db} lang={lang} />;
    if (activeTab === 'reviews') return <ReviewsPage db={db} setDb={setDb} lang={lang} />;
    if (activeTab === 'settings') return <SettingsPage db={db} setDb={setDb} />;
    if (activeTab === 'users') return <UsersPage db={db} setDb={setDb} />;
    if (activeTab === 'accounts') return <AccountsPage db={db} setDb={setDb} lang={lang} />;
    if (activeTab === 'contacts') return <ContactsPage db={db} setDb={setDb} lang={lang} />;
    if (activeTab === 'facilities') return <FacilitiesPage db={db} setDb={setDb} lang={lang} />;
    
    return <div className="p-10 text-center text-slate-400 font-bold">Content under construction for {activeTab}</div>;
  };

  const menuItems = getMenuItems();

  return (
    <div className={`flex h-screen bg-slate-50 font-sans ${t.dir === 'rtl' ? 'rtl' : 'ltr'}`} dir={t.dir}>
      <aside className={`fixed inset-y-0 ${t.dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'} z-50 w-64 bg-white border-slate-200 transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : (t.dir === 'rtl' ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 sm:p-6 shrink-0 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">Z</div>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">ZimmerPro</h1>
             </div>
             <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={20}/></button>
          </div>

          <nav className="flex-1 px-2 sm:px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-slate-900 text-white font-bold shadow-lg shadow-slate-200 scale-[1.02]' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 shrink-0">
             <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-rose-500 hover:bg-rose-50 transition-all font-bold rounded-xl"
             >
                <LogOut size={18} />
                <span className="text-sm">{t.logout}</span>
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 md:px-8 z-20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-500">
              <Menu size={24} />
            </button>
            <div className="relative group">
              <Search size={16} className={`absolute ${t.dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} />
              <input 
                type="text" 
                placeholder={t.search}
                className={`bg-slate-50 border-none rounded-full ${t.dir === 'rtl' ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-2 text-xs w-32 sm:w-48 md:w-64 focus:ring-2 focus:ring-slate-200 transition-all`} 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             <div className="relative">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-all border border-slate-200"
                >
                  <Languages size={14} />
                  {lang.toUpperCase()}
                </button>
                {showLangMenu && (
                  <div className={`absolute top-full mt-2 ${t.dir === 'rtl' ? 'left-0' : 'right-0'} w-32 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50 animate-scaleIn`}>
                    {[
                      { id: 'he', label: 'עברית' },
                      { id: 'en', label: 'English' },
                      { id: 'ar', label: 'العربية' }
                    ].map(l => (
                      <button 
                        key={l.id}
                        onClick={() => { setLang(l.id as Language); setShowLangMenu(false); }}
                        className={`w-full text-right px-4 py-2 text-xs font-bold hover:bg-slate-50 transition-colors ${lang === l.id ? 'text-indigo-600' : 'text-slate-600'}`}
                        dir={l.id === 'en' ? 'ltr' : 'rtl'}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
             </div>

             {db.originalAdminUser && (
                <button 
                    onClick={handleReturnToAdmin}
                    className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-700 flex items-center gap-2 transition-all shadow-md shadow-purple-200"
                    title="חזור למצב אדמין"
                >
                    <ArrowLeft size={14} />
                    <span className="hidden sm:inline">חזור לאדמין</span>
                </button>
             )}
             {db.currentUser?.role === UserRole.ADMIN && !db.originalAdminUser && (
                <button 
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-2 transition-all shadow-md shadow-slate-200"
                >
                    {isDeploying ? <RefreshCcw size={14} className="animate-spin" /> : <CloudUpload size={14} />}
                    <span className="hidden sm:inline">{t.push_to_server}</span>
                </button>
             )}
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className={`text-right hidden md:block ${t.dir === 'ltr' ? 'text-left' : ''}`}>
                <p className="text-xs font-black text-slate-800 leading-none">
                  {db.originalAdminUser ? `${db.currentUser?.name} (כקוח)` : db.currentUser?.name}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {db.originalAdminUser ? 'מצב תצוגה' : db.currentUser?.role}
                </p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs text-white font-bold group-hover:rotate-6 transition-all shadow-lg ${
                db.originalAdminUser ? 'bg-purple-600 shadow-purple-100' : 'bg-indigo-600 shadow-indigo-100'
              }`}>
                {db.currentUser?.name?.charAt(0) || '?'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative scroll-smooth bg-[#F9FAFB]">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
