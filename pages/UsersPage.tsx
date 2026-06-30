
import React, { useState, useEffect } from 'react';
import { AppState, User, UserRole } from '../types';
import { usersAPI, accountsAPI, authAPI } from '../api';
import { 
  Plus, UserPlus, Shield, Mail, CheckCircle2, MoreVertical, Trash2, Edit2, X, Eye, EyeOff, Lock, UserCheck, AlertCircle, Clock, Link as LinkIcon, LogIn
} from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
}

const UsersPage: React.FC<Props> = ({ db, setDb }) => {
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalModal, setApprovalModal] = useState<{ user: User; selectedRole: UserRole } | null>(null);
  const currentUserInfo = db.currentUser;
  const isAdmin = currentUserInfo?.role === UserRole.ADMIN;
  
  // Filter users based on current user's role
  const getVisibleUsers = () => {
    if (isAdmin) {
      // Admin sees all users
      return db.users;
    } else if (currentUserInfo?.role === UserRole.COMPLEX_OWNER || currentUserInfo?.role === UserRole.MANAGER) {
      // Complex owner/manager sees only themselves (since Account → User relationship)
      // Accounts are linked to users, not the other way around
      return db.users.filter(u => u.id === currentUserInfo.id);
    } else {
      // Other roles see only themselves
      return db.users.filter(u => u.id === currentUserInfo?.id);
    }
  };
  
  const visibleUsers = getVisibleUsers();
  
  const [currentUser, setCurrentUser] = useState<Partial<User> & { ownerType?: 'client' | 'zimmer_owner' | 'complex_owner' | 'admin', numberOfComplexes?: number }>({
    name: '',
    email: '',
    password: '',
    idNumber: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: UserRole.ZIMMER_OWNER,
    isActive: true,
    accountId: undefined,
    isApproved: true,
    ownerType: 'zimmer_owner',
    numberOfComplexes: 0
  });

  // Load users from API on mount
  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (modalMode === 'add' || modalMode === 'edit') {
      const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      if (fullName) {
        const currentName = currentUser.name || '';
        const expectedAutoName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
        
        if (!currentName || currentName === expectedAutoName || currentName === `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()) {
          setCurrentUser(prev => {
            if (prev.name !== fullName) {
              return {...prev, name: fullName};
            }
            return prev;
          });
        }
      }
    }
  }, [currentUser.firstName, currentUser.lastName, modalMode]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('👥 [UsersPage] Loading users from API...');
      const data = await usersAPI.getAll();
      console.log('👥 [UsersPage] Users loaded:', data?.length || 0);
      // Update local db for compatibility
      setDb({ ...db, users: data || [] });
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת המשתמשים');
      console.error('❌ [UsersPage] Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (user: User) => {
    // Open approval modal to allow admin to select new role
    setApprovalModal({ user, selectedRole: user.role });
  };

  const handleConfirmApproval = async () => {
    if (!approvalModal) return;

    try {
      setLoading(true);
      const { user, selectedRole } = approvalModal;
      
      console.log('👥 [UsersPage] Approving user with role change:', { userId: user.id, newRole: selectedRole });
      
      // Determine ownerType based on selected role
      let ownerType: 'client' | 'zimmer_owner' | 'complex_owner' | 'admin' = 'client';
      if (selectedRole === UserRole.ADMIN) {
        ownerType = 'admin';
      } else if (selectedRole === UserRole.COMPLEX_OWNER || selectedRole === UserRole.MANAGER) {
        ownerType = 'complex_owner';
      } else if (selectedRole === UserRole.ZIMMER_OWNER) {
        ownerType = 'zimmer_owner';
      } else {
        ownerType = 'client'; // CLIENT or CUSTOMER
      }

      // Update user with new role, approval status, and UserSettings
      await usersAPI.update(user.id, { 
        isApproved: true,
        role: selectedRole,
        ownerType: ownerType,
        numberOfComplexes: (ownerType === 'complex_owner' || ownerType === 'admin') ? 1 : 0
      });
      
      // Reload users from API
      await loadUsers();
      setApprovalModal(null);
    } catch (err: any) {
      console.error('❌ [UsersPage] Error approving user:', err);
      alert(err.message || 'שגיאה באישור המשתמש');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setCurrentUser({
      name: '',
      email: '',
      password: '',
      idNumber: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      role: UserRole.ZIMMER_OWNER,
      isActive: true,
      accountId: undefined,
      isApproved: true,
      ownerType: 'zimmer_owner',
      numberOfComplexes: 0
    });
    setModalMode('add');
    setShowPassword(false);
  };

  const openEditModal = async (user: User) => {
    // Determine ownerType from role (always sync with role)
    let ownerType: 'client' | 'zimmer_owner' | 'complex_owner' | 'admin' = 'client';
    if (user.role === UserRole.ADMIN) {
      ownerType = 'admin';
    } else if (user.role === UserRole.COMPLEX_OWNER || user.role === UserRole.MANAGER) {
      ownerType = 'complex_owner';
    } else if (user.role === UserRole.ZIMMER_OWNER) {
      ownerType = 'zimmer_owner';
    } else {
      ownerType = 'client'; // CLIENT or CUSTOMER
    }
    
    // Get numberOfComplexes from UserSettings if available, otherwise default
    let numberOfComplexes = 0;
    if (user.userSettings) {
      numberOfComplexes = user.userSettings.numberOfComplexes || 0;
    } else if (ownerType === 'complex_owner' || ownerType === 'admin') {
      // Default to 1 for complex_owner/admin if not set
      numberOfComplexes = 1;
    }
    
    setCurrentUser({
      ...user,
      ownerType: ownerType, // Always sync with role
      numberOfComplexes: numberOfComplexes
    });
    setModalMode('edit');
    setShowPassword(false);
  };

  const handleSaveUser = async () => {
    // Build name from firstName and lastName if name is empty
    let finalName = currentUser.name;
    if (!finalName && (currentUser.firstName || currentUser.lastName)) {
      finalName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    }

    // Validate required fields
    if (!finalName || !currentUser.email) {
      alert('אנא מלא שם מלא ואימייל');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentUser.email)) {
      alert('אנא הזן אימייל תקין');
      return;
    }

    // For new users, ensure password is set (minimum 3 characters)
    if (modalMode === 'add' && (!currentUser.password || currentUser.password.length < 3)) {
      alert('אנא הזן סיסמה (לפחות 3 תווים)');
      return;
    }

    // יצירת מתחם מיוזר - אופציונלי (לא חובה)
    const newAccountNameInput = document.getElementById('newAccountName') as HTMLInputElement;
    const newAccountMaxUnitsInput = document.getElementById('newAccountMaxUnits') as HTMLInputElement;
    const newAccountName = newAccountNameInput?.value?.trim();
    
    // If creating new account, validate name length (אם בוחרים ליצור)
    if (newAccountName && newAccountName.length < 2) {
      alert('שם המתחם חייב להכיל לפחות 2 תווים');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalAccountId = currentUser.accountId;
      let newAccountId: string | undefined = undefined;
      
      // If complex_owner/manager and no account selected, create new one
      if ((currentUser.role === UserRole.COMPLEX_OWNER || currentUser.role === UserRole.MANAGER) && !finalAccountId && newAccountName) {
        const maxUnits = Number(newAccountMaxUnitsInput?.value) || 3;
        
        console.log('👥 [UsersPage] Creating new account:', { name: newAccountName, maxUnits });
        
        // Create new account (עדיין לא מקושר ליוזר כי הוא עדיין לא נוצר)
        const newAccount = await accountsAPI.create({
          name: newAccountName,
          email: currentUser.email, // Use user's email as account contact email
          phone: currentUser.phoneNumber || '',
          maxUnits: maxUnits,
          is_active: true,
          logo: 'https://picsum.photos/40/40?seed=' + Math.random()
        });
        
        console.log('👥 [UsersPage] New account created:', newAccount);
        finalAccountId = newAccount.id;
        newAccountId = newAccount.id; // שמירה לעדכון מאוחר יותר
        
        // Reload accounts to update the dropdown
        const updatedAccounts = await accountsAPI.getAll();
        setDb({ ...db, accounts: updatedAccounts || [] });
      }

      // יצירת מתחם היא אופציונלית - לא חובה

      // accountId is now ObjectId (string) - not number
      // For admin: can be undefined (no account)
      // For other roles: use the accountId as string (ObjectId)
      const finalAccountIdString = currentUser.role === UserRole.ADMIN ? undefined : (finalAccountId ? String(finalAccountId) : undefined);

      const userData: any = {
        name: finalName,
        email: currentUser.email.toLowerCase().trim(),
        idNumber: currentUser.idNumber || undefined,
        firstName: currentUser.firstName || undefined,
        lastName: currentUser.lastName || undefined,
        phoneNumber: currentUser.phoneNumber || undefined,
        role: currentUser.role || UserRole.ZIMMER_OWNER,
        accountId: finalAccountIdString, // ObjectId as string
        isApproved: currentUser.isApproved !== false,
        isActive: currentUser.isActive !== false,
        ownerType: currentUser.ownerType || 'zimmer_owner', // הגדרות משתמש
        numberOfComplexes: currentUser.numberOfComplexes || 0 // הגדרות משתמש
      };

      // Only include password if provided or if creating new user
      if (modalMode === 'add') {
        userData.password = currentUser.password || '123456';
      } else if (currentUser.password && currentUser.password.length >= 3) {
        userData.password = currentUser.password;
      }

      let createdUserId: string | undefined = undefined;
      if (modalMode === 'add') {
        console.log('👥 [UsersPage] Creating user:', userData);
        const createdUser = await usersAPI.create(userData);
        createdUserId = createdUser.data?.id || createdUser.id;
        // alert('המשתמש נוצר בהצלחה!');
      } else if (modalMode === 'edit' && currentUser.id) {
        console.log('👥 [UsersPage] Updating user:', currentUser.id, userData);
        // Don't send password if not changed
        if (!userData.password) {
          delete userData.password;
        }
        await usersAPI.update(currentUser.id, userData);
        // alert('המשתמש עודכן בהצלחה!');
      }

      // אם נוצר חשבון חדש לבעל מתחם, קשר אותו אוטומטית ליוזר
      if (modalMode === 'add' && newAccountId && createdUserId && (currentUser.role === UserRole.COMPLEX_OWNER || currentUser.role === UserRole.MANAGER)) {
        console.log('👥 [UsersPage] Linking account to user:', { accountId: newAccountId, userId: createdUserId });
        await accountsAPI.update(newAccountId, { userId: createdUserId });
      }

      // Reload users from API
      await loadUsers();
      setModalMode(null);
    } catch (err: any) {
      console.error('❌ [UsersPage] Error saving user:', err);
      const errorMessage = err.message || 'שגיאה בשמירת המשתמש';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) return;

    try {
      console.log('👥 [UsersPage] Deleting user:', id);
      await usersAPI.delete(id);
      // Reload users from API
      await loadUsers();
    } catch (err: any) {
      console.error('❌ [UsersPage] Error deleting user:', err);
      alert(err.message || 'שגיאה במחיקת המשתמש');
    }
  };

  const handleLoginAsClient = async (targetUser: User) => {
    if (!currentUserInfo || currentUserInfo.role !== UserRole.ADMIN) {
      alert('רק אדמין יכול להשתמש בתכונה זו');
      return;
    }

    const roleLabel = getRoleLabel(targetUser.role);
    if (!confirm(`האם אתה בטוח שברצונך להתחבר כ${roleLabel} "${targetUser.name}"?`)) {
      return;
    }

    try {
      const result = await authAPI.impersonate(targetUser.id);
      const userData = result.user || result;

      setDb({
        ...db,
        originalAdminUser: currentUserInfo,
        currentUser: userData
      });

      console.log('🔄 [UsersPage] Impersonating user:', {
        originalAdmin: currentUserInfo.name,
        targetUser: userData.name,
        targetRole: userData.role
      });
    } catch (err: any) {
      console.error('❌ [UsersPage] Impersonation failed:', err);
      alert('שגיאה בהתחברות כמשתמש: ' + (err.message || 'Unknown error'));
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-purple-50 text-purple-600 border-purple-100';
      case UserRole.ZIMMER_OWNER: return 'bg-blue-50 text-blue-600 border-blue-100';
      case UserRole.COMPLEX_OWNER: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'אדמין מערכת';
      case UserRole.ZIMMER_OWNER: return 'בעל צימר';
      case UserRole.COMPLEX_OWNER: return 'בעל מתחם';
      case UserRole.MANAGER: return 'מנהל תפעול';
      case UserRole.CLIENT: return 'לקוח';
      case UserRole.CUSTOMER: return 'לקוח';
      default: return role;
    }
  };

  if (loading && db.users.length === 0) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="text-center py-20">
          <div className="text-slate-400">טוען משתמשים...</div>
        </div>
      </div>
    );
  }

  if (error && db.users.length === 0) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <div className="text-red-600 font-bold mb-2">שגיאה בטעינת המשתמשים</div>
          <div className="text-red-500 text-sm">{error}</div>
          <button 
            onClick={loadUsers}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-all"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">ניהול משתמשים והרשאות</h2>
          <p className="text-slate-500 font-medium">הגדרת תפקידים, שיוך למתחמי אירוח ואישור חשבונות חדשים.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={openAddModal}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <UserPlus size={18} />
            משתמש חדש
          </button>
        )}
      </div>

      {isAdmin && db.users.some(u => !u.isApproved) && (
        <div className="bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-200 rounded-[2rem] p-8 shadow-lg animate-pulse">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-rose-700 flex items-center gap-3">
                    <div className="p-2 bg-rose-100 rounded-xl">
                        <AlertCircle size={24} className="text-rose-600" />
                    </div>
                    בקשות הצטרפות הממתינות לאישור
                </h3>
                <div className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-sm">
                    {db.users.filter(u => !u.isApproved).length} משתמשים
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {db.users.filter(u => !u.isApproved).map(user => (
                    <div key={user.id} className="p-5 bg-white rounded-2xl border-2 border-rose-200 shadow-md hover:shadow-lg transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-lg shadow-sm">
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-slate-800">{user.name}</p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                                <p className="text-[10px] text-rose-600 font-black uppercase mt-1 bg-rose-50 px-2 py-0.5 rounded w-fit">
                                    {getRoleLabel(user.role)} - ממתין לאישור
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleApprove(user)}
                            className="p-3 bg-emerald-500 text-white rounded-xl shadow-md hover:bg-emerald-600 hover:shadow-lg transition-all flex items-center gap-2 font-bold text-sm"
                            title="אשר משתמש"
                        >
                            <UserCheck size={18} />
                            <span className="hidden md:inline">אשר</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest">משתמש</th>
                <th className="px-6 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest">תפקיד</th>
                <th className="px-6 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest">מתחם משויך</th>
                <th className="px-6 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest">סטטוס</th>
                <th className="px-6 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{user.name}</p>
                        <p className="text-[11px] text-slate-400 font-bold">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${getRoleBadge(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      // Find accounts linked to this user (Account.userId === User.id)
                      const userAccounts = db.accounts.filter(a => a.userId === user.id);
                      if (userAccounts.length > 0) {
                        return (
                          <div className="flex flex-col gap-1">
                            {userAccounts.map(account => (
                              <div key={account.id} className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit">
                                <LinkIcon size={12} className="text-indigo-400" />
                                {account.name}
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return (
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ללא שיוך</span>
                        );
                      }
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-xs font-black ${user.isApproved ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {user.isApproved ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      {user.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        user.role === UserRole.CLIENT || 
                        user.role === UserRole.CUSTOMER || 
                        user.role === UserRole.COMPLEX_OWNER || 
                        user.role === UserRole.ZIMMER_OWNER
                      ) && (
                        <button 
                          onClick={() => handleLoginAsClient(user)} 
                          className="p-2 text-purple-600 hover:text-purple-700 bg-purple-50 border border-purple-200 rounded-xl shadow-sm hover:shadow-md transition-all"
                          title={`התחבר כ${getRoleLabel(user.role)}`}
                        >
                          <LogIn size={16} />
                        </button>
                      )}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 rounded-xl"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-100 rounded-xl"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalMode(null)}></div>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    {modalMode === 'add' ? <UserPlus size={20} /> : <Edit2 size={20} />}
                  </div>
                  {modalMode === 'add' ? 'משתמש חדש' : 'עריכת משתמש'}
                </h3>
                <button onClick={() => setModalMode(null)} className="text-slate-400 hover:rotate-90 transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>
              
            <div className="p-8 overflow-y-auto flex-1 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">תעודת זהות</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    maxLength={9}
                    value={currentUser.idNumber || ''}
                    onChange={e => setCurrentUser({...currentUser, idNumber: e.target.value.replace(/[^0-9]/g, '')})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">שם פרטי</label>
                    <input 
                      type="text" 
                      value={currentUser.firstName || ''}
                      onChange={e => setCurrentUser({...currentUser, firstName: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">שם משפחה</label>
                    <input 
                      type="text" 
                      value={currentUser.lastName || ''}
                      onChange={e => setCurrentUser({...currentUser, lastName: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">שם מלא (אוטומטי)</label>
                  <input 
                    type="text" 
                    value={currentUser.name || ''}
                    onChange={e => setCurrentUser({...currentUser, name: e.target.value})}
                    placeholder={currentUser.firstName && currentUser.lastName ? `${currentUser.firstName} ${currentUser.lastName}` : 'או הזן ידנית'}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">אימייל</label>
                    <input 
                      type="email" 
                      value={currentUser.email}
                      onChange={e => setCurrentUser({...currentUser, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">טלפון</label>
                    <input 
                      type="tel" 
                      value={currentUser.phoneNumber || ''}
                      onChange={e => setCurrentUser({...currentUser, phoneNumber: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">סיסמה</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={currentUser.password}
                      onChange={e => setCurrentUser({...currentUser, password: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">תפקיד</label>
                    <select 
                      value={currentUser.role}
                      onChange={e => {
                        const newRole = e.target.value as UserRole;
                        // עדכון אוטומטי של ownerType ב-UserSettings לפי התפקיד
                        let newOwnerType: 'client' | 'zimmer_owner' | 'complex_owner' | 'admin' = 'client';
                        if (newRole === UserRole.ADMIN) {
                          newOwnerType = 'admin';
                        } else if (newRole === UserRole.COMPLEX_OWNER || newRole === UserRole.MANAGER) {
                          newOwnerType = 'complex_owner';
                        } else if (newRole === UserRole.ZIMMER_OWNER) {
                          newOwnerType = 'zimmer_owner';
                        } else {
                          // Default for other roles (CLIENT, CUSTOMER)
                          newOwnerType = 'client';
                        }
                        
                        setCurrentUser({
                          ...currentUser, 
                          role: newRole, 
                          accountId: undefined,
                          ownerType: newOwnerType,
                          numberOfComplexes: newOwnerType === 'complex_owner' ? (currentUser.numberOfComplexes || 1) : 0
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                    >
                      <option value={UserRole.ADMIN}>אדמין מערכת</option>
                      <option value={UserRole.ZIMMER_OWNER}>בעל צימר</option>
                      <option value={UserRole.COMPLEX_OWNER}>בעל מתחם</option>
                      <option value={UserRole.MANAGER}>מנהל תפעול</option>
                      <option value={UserRole.CLIENT}>לקוח</option>
                    </select>
                  </div>
                  {(currentUser.role === UserRole.COMPLEX_OWNER || currentUser.role === UserRole.MANAGER) && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">מתחם/חשבון (אופציונלי)</label>
                      <select 
                        value={currentUser.accountId || ''}
                        onChange={e => setCurrentUser({...currentUser, accountId: e.target.value || undefined})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="">ללא מתחם (אופציונלי)</option>
                        {db.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* הגדרות משתמש - מתעדכן אוטומטית לפי התפקיד */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest mb-3">הגדרות משתמש (מתעדכן אוטומטית לפי התפקיד)</p>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">סוג בעלות (אוטומטי)</label>
                    <input 
                      type="text" 
                      value={
                        currentUser.ownerType === 'admin' ? 'אדמין' :
                        currentUser.ownerType === 'zimmer_owner' ? 'בעל צימר' : 
                        currentUser.ownerType === 'complex_owner' ? 'בעל מתחם' : 
                        currentUser.ownerType === 'client' ? 'לקוח' :
                        'לקוח'
                      }
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-600 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 mr-1">מתעדכן אוטומטית לפי התפקיד שנבחר</p>
                  </div>

                  {(currentUser.ownerType === 'complex_owner' || currentUser.ownerType === 'admin') && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">מספר מתחמים מותרים</label>
                      <input 
                        type="number" 
                        min="0"
                        value={currentUser.numberOfComplexes || 0}
                        onChange={e => setCurrentUser({...currentUser, numberOfComplexes: parseInt(e.target.value) || 0})}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                        placeholder="כמה מתחמים מותרים?"
                      />
                    </div>
                  )}
                </div>

                {(currentUser.role === UserRole.COMPLEX_OWNER || currentUser.role === UserRole.MANAGER) && !currentUser.accountId && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-4">
                    <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">או צור מתחם חדש:</p>
                    <input 
                      type="text" 
                      placeholder="שם המתחם החדש"
                      className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                      id="newAccountName"
                    />
                    <input 
                      type="number" 
                      placeholder="מספר יחידות מקסימום"
                      min="1"
                      defaultValue="3"
                      className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                      id="newAccountMaxUnits"
                    />
                  </div>
                )}
            </div>
              
            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4 flex-shrink-0">
              <button 
                onClick={handleSaveUser}
                className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
              >
                {modalMode === 'add' ? 'צור משתמש' : 'שמור שינויים'}
              </button>
              <button 
                onClick={() => setModalMode(null)}
                className="flex-1 bg-white text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all border border-slate-200"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setApprovalModal(null)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-scaleIn">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <UserCheck size={20} />
                  </div>
                  אישור משתמש חדש
                </h3>
                <button onClick={() => setApprovalModal(null)} className="text-slate-400 hover:rotate-90 transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>
              
            <div className="p-8 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">משתמש</p>
                <p className="text-lg font-black text-slate-800">{approvalModal.user.name}</p>
                <p className="text-sm text-slate-500">{approvalModal.user.email}</p>
                <p className="text-xs text-slate-400 mt-2">תפקיד נוכחי: {getRoleLabel(approvalModal.user.role)}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">
                  בחר תפקיד חדש למשתמש
                </label>
                <select 
                  value={approvalModal.selectedRole}
                  onChange={e => setApprovalModal({ ...approvalModal, selectedRole: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                >
                  <option value={UserRole.CLIENT}>לקוח</option>
                  <option value={UserRole.ZIMMER_OWNER}>בעל צימר</option>
                  <option value={UserRole.COMPLEX_OWNER}>בעל מתחם</option>
                  <option value={UserRole.MANAGER}>מנהל תפעול</option>
                  <option value={UserRole.ADMIN}>אדמין מערכת</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-2 mr-1">
                  המשתמש יאושר ויקבל את התפקיד שנבחר
                </p>
              </div>
            </div>
              
            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={handleConfirmApproval}
                disabled={loading}
                className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'מאשר...' : 'אשר משתמש'}
              </button>
              <button 
                onClick={() => setApprovalModal(null)}
                disabled={loading}
                className="flex-1 bg-white text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 disabled:opacity-50"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
