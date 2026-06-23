
import React, { useState, useEffect } from 'react';
import { AppState, Account, UserRole } from '../types';
import { translations, Language } from '../translations';
import { accountsAPI, unitsAPI, usersAPI } from '../api';
import { 
  Plus, Briefcase, Phone, Mail, X, Key, Users, Home, Trash2, Edit2, CheckCircle2, MoreVertical, Shield, ExternalLink, Loader2
} from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

const AccountsPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [currentAccount, setCurrentAccount] = useState<Partial<Account>>({
    name: '',
    phone: '',
    email: '',
    // token: '',
    is_active: true,
    maxUnits: 5,
    logo: 'https://picsum.photos/40/40?seed=' + Math.random(),
    userId: undefined
  });

  useEffect(() => {
    loadAccounts();
    loadUnits();
    if (isAdmin) {
      loadUsers();
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🏢 [AccountsPage] Page visible - reloading units and users');
        loadUnits();
        if (isAdmin) {
          loadUsers();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      console.log('🏢 [AccountsPage] Loading accounts from API...');
      console.log('🏢 [AccountsPage] Current user:', {
        id: user?.id,
        role: user?.role,
        userSettingsId: user?.userSettingsId
      });
      const data = await accountsAPI.getAll();
      console.log('🏢 [AccountsPage] Accounts loaded:', data?.length || 0);
      
      // For complex_owner, backend should return all their accounts (linked via userId)
      // No need to load by accountId anymore
      
      setAccounts(data || []);
      setDb((prevDb) => ({ ...prevDb, accounts: data || [] }));
    } catch (err: any) {
      console.error('❌ [AccountsPage] Error loading accounts:', err);
      alert('שגיאה בטעינת החשבונות: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    try {
      console.log('🏢 [AccountsPage] Loading units from API...');
      const data = await unitsAPI.getAll();
      console.log('🏢 [AccountsPage] Units loaded:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🏢 [AccountsPage] Sample unit accountIds:', data.slice(0, 3).map((u: any) => ({ id: u.id, accountId: u.accountId, accountIdType: typeof u.accountId })));
      }
      setUnits(data || []);
      setDb((prevDb) => ({ ...prevDb, units: data || [] }));
    } catch (err: any) {
      console.error('❌ [AccountsPage] Error loading units:', err);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('🏢 [AccountsPage] Loading users from API...');
      const data = await usersAPI.getAll();
      console.log('🏢 [AccountsPage] Users loaded:', data?.length || 0);
      setUsers(data || []);
      setDb((prevDb) => ({ ...prevDb, users: data || [] }));
    } catch (err: any) {
      console.error('❌ [AccountsPage] Error loading users:', err);
    }
  };

  const handleOpenAdd = () => {
    // No accountNumber - MongoDB will create _id automatically
    setCurrentAccount({
      name: '',
      phone: '',
      email: '',
      // token: 'ACC-' + Math.floor(1000 + Math.random() * 9000),
      is_active: true,
      maxUnits: 5,
      logo: 'https://picsum.photos/40/40?seed=' + Math.random(),
      userId: user?.role === UserRole.COMPLEX_OWNER ? user.id : undefined // בעל מתחם יוצר לעצמו
    });
    setModalMode('add');
    setShowModal(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setCurrentAccount(acc);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSaveAccount = async () => {
    if (!currentAccount.name || !currentAccount.email) return;
    
    // Check limit before creating (only for complex_owner, admin has no limit)
    if (modalMode === 'add' && !isAdmin && (user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER)) {
      const userSettings = user?.userSettings;
      if (userSettings) {
        const numberOfComplexes = userSettings.numberOfComplexes || 0;
        if (numberOfComplexes > 0) {
          const currentAccountsCount = accounts.filter(a => a.userId === user.id).length;
          if (currentAccountsCount >= numberOfComplexes) {
            alert(`המכסה הושלמה! יש לך ${currentAccountsCount} מתחמים מתוך ${numberOfComplexes} מותרים בהגדרות.`);
            return;
          }
        }
      }
    }
    
    // שיוך ליוזר הוא חובה רק לאדמין
    // בעל מתחם יוצר מתחם לעצמו
    if (isAdmin && !currentAccount.userId) {
      alert('חובה לבחור יוזר לשיוך למתחם');
      return;
    }
    
    // אם זה בעל מתחם, שייך את המתחם לעצמו
    if (user?.role === UserRole.COMPLEX_OWNER && !currentAccount.userId) {
      currentAccount.userId = user.id;
    }

    try {
      const accountData = {
        name: currentAccount.name,
        phone: currentAccount.phone,
        email: currentAccount.email,
       is_active: currentAccount.is_active !== false,
        maxUnits: Number(currentAccount.maxUnits) || 5,
        logo: currentAccount.logo || 'https://picsum.photos/40/40?seed=' + Math.random(),
        userId: currentAccount.userId // שיוך ליוזר (חובה)
      };

      if (modalMode === 'add') {
        console.log('🏢 [AccountsPage] Creating account:', accountData);
        await accountsAPI.create(accountData);
      } else if (currentAccount.id) {
        console.log('🏢 [AccountsPage] Updating account:', currentAccount.id, accountData);
        await accountsAPI.update(currentAccount.id, accountData);
      }

      // Reload accounts, units, and users from API
      await loadAccounts();
      await loadUnits();
      // Only admin can load all users - complex_owner doesn't have permission
      if (isAdmin) {
        await loadUsers();
      }
      setShowModal(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('❌ [AccountsPage] Error saving account:', err);
      alert('שגיאה בשמירת החשבון: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('מחק מתחם זה? פעולה זו תמחוק את כל הנתונים המשויכים אליו.')) return;

    try {
      console.log('🏢 [AccountsPage] Deleting account:', id);
      await accountsAPI.delete(id);
      // Reload accounts, units, and users from API
      await loadAccounts();
      await loadUnits();
      // Only admin can load all users - complex_owner doesn't have permission
      if (isAdmin) {
        await loadUsers();
      }
    } catch (err: any) {
      console.error('❌ [AccountsPage] Error deleting account:', err);
      alert('שגיאה במחיקת החשבון: ' + (err.message || 'Unknown error'));
    }
  };

  const getAccountStats = (accountId: string) => {
    // accountId is now ObjectId (string) - only handle ObjectId, not old accountNumber
    // Use local state (units, users) instead of db for more reliable data
    const unitsToCheck = units.length > 0 ? units : db.units;
    const usersToCheck = users.length > 0 ? users : db.users;
    
    // Count units linked to this account using linkType and linkedToId (new structure)
    // Also check accountId for backward compatibility
    const unitsCount = unitsToCheck.filter((u: any) => {
      // New structure: linkType === 'account' && linkedToId === accountId
      if (u.linkType === 'account' && u.linkedToId === accountId) {
        return true;
      }
      // Backward compatibility: check accountId (deprecated)
      if (typeof u.accountId === 'string' && typeof accountId === 'string' && u.accountId === accountId) {
        return true;
      }
      return false;
    }).length;
    
    // Users are not linked to accounts anymore (Account is linked to User via userId)
    // So usersCount is always 0 or we can count users where Account.userId matches
    const usersCount = 0; // Users are not linked to accounts - accounts are linked to users
    
    return { unitsCount, usersCount };
  };

  // For complex_owner, show all their accounts (already filtered by backend)
  // No need to filter by accountId - backend returns all accounts linked to user
  let displayedAccounts = accounts;
  
  // Check if complex_owner can create more accounts based on UserSettings
  const canCreateMoreAccounts = () => {
    if (isAdmin) {
      return true; // Admin has no limit
    }
    
    if (user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER) {
      // Check UserSettings for numberOfComplexes
      const userSettings = user?.userSettings;
      if (userSettings) {
        const numberOfComplexes = userSettings.numberOfComplexes || 0;
        // If numberOfComplexes is 0, allow unlimited (or handle as needed)
        if (numberOfComplexes === 0) {
          return true; // Unlimited
        }
        // Check if current accounts count is less than allowed
        const currentAccountsCount = accounts.filter(a => a.userId === user.id).length;
        return currentAccountsCount < numberOfComplexes;
      }
      // If no UserSettings, allow creation (fallback)
      return true;
    }
    
    return false; // Other roles cannot create accounts
  };
  
  const canCreate = canCreateMoreAccounts();
  const userAccountsCount = user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER 
    ? accounts.filter(a => a.userId === user.id).length 
    : 0;
  const maxAllowedComplexes = user?.userSettings?.numberOfComplexes || 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-white/10">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <span className="font-bold">{modalMode === 'add' ? 'המתחם נוצר בהצלחה' : 'השינויים נשמרו'}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.accounts}</h2>
          <p className="text-slate-500 font-medium">ניהול מתחמי אירוח, הגדרות חשבון ומכסות יחידות.</p>
        </div>
        {(isAdmin || (user?.role === UserRole.COMPLEX_OWNER && canCreate)) && (
          <button 
            onClick={handleOpenAdd}
            disabled={!canCreate && !isAdmin}
            className={`px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-slate-200 ${
              canCreate || isAdmin
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Plus size={18} />
            {t.add_account}
          </button>
        )}
        {user?.role === UserRole.COMPLEX_OWNER && !canCreate && maxAllowedComplexes > 0 && (
          <div className="text-sm text-rose-600 font-bold">
            המכסה הושלמה: {userAccountsCount} מתוך {maxAllowedComplexes} מתחמים
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right" dir={t.dir}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">מתחם</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">פרטי קשר</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">מכסה</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">משתמשים</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">סטטוס</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-400">
                      <Loader2 size={24} className="animate-spin" />
                      <span className="font-bold">טוען מתחמים...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Briefcase size={48} className="opacity-50" />
                      <span className="font-bold">אין מתחמים להצגה</span>
                      <span className="text-xs">נסה ליצור מתחם חדש או בדוק את ההרשאות שלך</span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedAccounts.map(account => {
                  const stats = getAccountStats(account.id);
                  return (
                  <tr key={account.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={account.logo} className="w-10 h-10 rounded-xl shadow-sm object-cover" alt="" />
                        <div>
                          <p className="text-sm font-black text-slate-800">{account.name}</p>
                          {/* <p className="text-[10px] font-mono text-indigo-500 font-bold uppercase">{account.token}</p> */}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                           <Mail size={12} className="text-slate-400" /> {account.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                           <Phone size={12} className="text-slate-400" /> {account.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-xs font-black ${stats.unitsCount >= account.maxUnits ? 'text-rose-500' : 'text-slate-800'}`}>
                          {stats.unitsCount} / {account.maxUnits}
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${stats.unitsCount >= account.maxUnits ? 'bg-rose-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min((stats.unitsCount / account.maxUnits) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <Users size={14} className="text-slate-400" />
                        {stats.usersCount}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${account.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleOpenEdit(account)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 rounded-xl shadow-sm"><Edit2 size={16}/></button>
                        {isAdmin && (
                          <button onClick={() => handleDeleteAccount(account.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-100 rounded-xl shadow-sm"><Trash2 size={16}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowModal(false)} style={{ pointerEvents: 'auto' }}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-scaleIn flex flex-col max-h-[90vh] relative" style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <Briefcase size={20} />
                </div>
                {modalMode === 'add' ? t.add_account : 'עריכת מתחם'}
              </h3>
              <X size={24} className="text-slate-400 cursor-pointer hover:rotate-90 transition-all" onClick={() => setShowModal(false)} />
            </div>
            
            <div className="p-8 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">{t.name}</label>
                <input 
                  type="text" 
                  value={currentAccount.name || ''}
                  onChange={e => setCurrentAccount({...currentAccount, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                  placeholder="למשל: אחוזת הכרמל"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">{t.email}</label>
                  <input 
                    type="email" 
                    value={currentAccount.email || ''} 
                    onChange={e => setCurrentAccount({...currentAccount, email: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">{t.phone}</label>
                  <input 
                    type="tel" 
                    value={currentAccount.phone || ''} 
                    onChange={e => setCurrentAccount({...currentAccount, phone: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">{t.max_units}</label>
                  <input 
                    type="number" 
                    value={currentAccount.maxUnits} 
                    onChange={e => setCurrentAccount({...currentAccount, maxUnits: Number(e.target.value)})} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">סטטוס</label>
                  <select 
                    value={currentAccount.is_active ? 'active' : 'inactive'}
                    onChange={e => setCurrentAccount({...currentAccount, is_active: e.target.value === 'active'})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="active">פעיל</option>
                    <option value="inactive">מושבת</option>
                  </select>
                </div>
              </div>

              {/* שיוך ליוזר - רק לאדמין */}
              {isAdmin && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">שיוך ליוזר <span className="text-rose-500">*</span></label>
                  <select 
                    value={currentAccount.userId || ''}
                    onChange={e => setCurrentAccount({...currentAccount, userId: e.target.value || undefined})}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">בחר יוזר לשיוך</option>
                    {users
                      .filter(u => u.role === UserRole.COMPLEX_OWNER || u.role === UserRole.ADMIN)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === UserRole.COMPLEX_OWNER ? 'בעל מתחם' : 'אדמין'})
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 mr-1">חובה לבחור יוזר - רק בעלי מתחם או אדמין יכולים להיות משויכים למתחם</p>
                </div>
              )}
              
              {/* בעל מתחם - מציג מידע שהמתחם משויך אליו */}
              {user?.role === UserRole.COMPLEX_OWNER && !isAdmin && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                  <p className="text-sm font-bold text-indigo-800">
                    המתחם יהיה משויך אליך אוטומטית
                  </p>
                </div>
              )}

              {/* Show linked units only in edit mode */}
              {modalMode === 'edit' && currentAccount.id && (
                <div className="border-t border-slate-100 pt-5 mt-5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 mr-1 tracking-widest flex items-center gap-2">
                    <Home size={14} className="text-slate-400" />
                    צימרים מקושרים ({units.filter((u: any) => 
                      (u.linkType === 'account' && u.linkedToId === currentAccount.id) || 
                      (u.accountId === currentAccount.id) // backward compatibility
                    ).length})
                  </label>
                  <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                    {units.filter((u: any) => 
                      (u.linkType === 'account' && u.linkedToId === currentAccount.id) || 
                      (u.accountId === currentAccount.id) // backward compatibility
                    ).length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Home size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold">אין צימרים מקושרים למתחם זה</p>
                      </div>
                    ) : (
                      units
                        .filter((u: any) => 
                          (u.linkType === 'account' && u.linkedToId === currentAccount.id) || 
                          (u.accountId === currentAccount.id) // backward compatibility
                        )
                        .map((unit: any) => (
                          <div
                            key={unit.id}
                            className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-sm font-black text-slate-800 mb-1">{unit.name}</p>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="font-bold">₪{unit.pricePerNight?.toLocaleString() || 0}/לילה</span>
                                  <span className="font-bold">{unit.capacity || 0} אורחים</span>
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                    unit.status === 'available' ? 'bg-emerald-50 text-emerald-600' :
                                    unit.status === 'occupied' ? 'bg-rose-50 text-rose-600' :
                                    unit.status === 'cleaning' ? 'bg-yellow-50 text-yellow-600' :
                                    'bg-slate-50 text-slate-600'
                                  }`}>
                                    {unit.status === 'available' ? 'זמין' :
                                     unit.status === 'occupied' ? 'תפוס' :
                                     unit.status === 'cleaning' ? 'ניקוי' :
                                     unit.status === 'maintenance' ? 'תחזוקה' : unit.status}
                                  </span>
                                </div>
                              </div>
                              {unit.images && unit.images.length > 0 && (
                                <img 
                                  src={unit.images[0]} 
                                  alt={unit.name}
                                  className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                                />
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={handleSaveAccount} 
                className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                {t.save}
              </button>
              <button 
                onClick={() => setShowModal(false)} 
                className="px-8 py-4 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
