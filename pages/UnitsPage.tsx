
import React, { useState, useEffect } from 'react';
import { AppState, ZimmerUnit, UnitStatus, Room, UserRole, Facility, SpecialPriceConfig, User } from '../types';
import { translations, Language } from '../translations';
import { unitsAPI, roomsAPI, facilitiesAPI, usersAPI, uploadAPI, accountsAPI } from '../api';

// Get API base URL for image URL fixing
const getApiBaseUrl = (): string => {
  // @ts-ignore - Vite env variable
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

// Helper function to fix image URLs (replace localhost with actual server URL)
const fixImageUrl = (url: string | null | undefined): string | null => {
  if (!url || !url.trim()) return null;
  
  // If it's already a blob URL, return as is
  if (url.startsWith('blob:')) {
    return url;
  }
  
  // If it's already a data URL, return as is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Get API base URL (without /api suffix)
  const getBackendBaseUrl = (): string => {
    if (typeof window === 'undefined') return '';
    
    // In development, use API URL without /api
    const apiUrl = getApiBaseUrl();
    if (apiUrl.includes('localhost:3000') || apiUrl.includes('127.0.0.1:3000')) {
      // Development: use backend server directly
      const backendUrl = apiUrl.replace('/api', '');
      return backendUrl;
    }
    
    // Production: use current origin (nginx serves both frontend and backend)
    // This ensures images are served from the same domain as the frontend
    return window.location.origin;
  };
  
  const originalUrl = url;
  let workingUrl = url.trim();
  
  // If URL contains /api/uploads, remove /api part first
  if (workingUrl.includes('/api/uploads/')) {
    workingUrl = workingUrl.replace('/api/uploads/', '/uploads/');
  }
  
  // If URL is relative (starts with /uploads), use current origin
  if (workingUrl.startsWith('/uploads/')) {
    const backendBaseUrl = getBackendBaseUrl();
    const fixedUrl = backendBaseUrl ? `${backendBaseUrl}${workingUrl}` : workingUrl;
    return fixedUrl;
  }
  
  // If URL is relative (starts with /), use current origin
  if (workingUrl.startsWith('/')) {
    const backendBaseUrl = getBackendBaseUrl();
    return backendBaseUrl ? `${backendBaseUrl}${workingUrl}` : workingUrl;
  }
  
  // If URL contains localhost:3000 or 127.0.0.1:3000, replace with current origin
  if (workingUrl.includes('localhost:3000') || workingUrl.includes('127.0.0.1:3000')) {
    const backendBaseUrl = getBackendBaseUrl();
    if (backendBaseUrl) {
      try {
        const urlObj = new URL(workingUrl);
        // Extract just the pathname and preserve query/hash
        const path = urlObj.pathname + urlObj.search + urlObj.hash;
        return `${backendBaseUrl}${path}`;
      } catch (e) {
        // If parsing fails, try to extract path manually
        const pathMatch = workingUrl.match(/\/(uploads\/[^?\s]*)/);
        if (pathMatch) {
          return `${backendBaseUrl}${pathMatch[1]}`;
        }
        // If no match, try to extract any path after the host
        const pathMatch2 = workingUrl.match(/localhost:3000(\/.*)/);
        if (pathMatch2) {
          return `${backendBaseUrl}${pathMatch2[1]}`;
        }
      }
    }
  }
  
  // If URL contains localhost (without port), might be from old data - try to fix
  if (workingUrl.includes('localhost') && !workingUrl.includes(':')) {
    const backendBaseUrl = getBackendBaseUrl();
    if (backendBaseUrl) {
      const pathMatch = workingUrl.match(/\/(uploads\/[^?\s]*)/);
      if (pathMatch) {
        return `${backendBaseUrl}${pathMatch[1]}`;
      }
    }
  }
  
  // If URL is already a full URL (starts with http:// or https://), check if it's from the same origin
  if (workingUrl.startsWith('http://') || workingUrl.startsWith('https://')) {
    try {
      const urlObj = new URL(workingUrl);
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      
      // If the URL is from a different origin but contains /uploads/, it might be wrong
      // In production, all uploads should be from the same origin
      if (currentOrigin && urlObj.origin !== currentOrigin) {
        // If it's a different origin but has /uploads/ path, fix it
        if (urlObj.pathname.startsWith('/uploads/')) {
          return `${currentOrigin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
        }
      }
      
      // If URL is valid and from same origin or external, return as is
      return workingUrl;
    } catch (e) {
      // Invalid URL, try to fix it
      const pathMatch = workingUrl.match(/\/(uploads\/[^?\s]*)/);
      if (pathMatch) {
        const backendBaseUrl = getBackendBaseUrl();
        return backendBaseUrl ? `${backendBaseUrl}${pathMatch[1]}` : workingUrl;
      }
    }
  }
  
  // Return original URL if we can't fix it
  return workingUrl;
};
import { 
  Plus, Edit2, Trash2, CheckCircle2, Bed, Waves, X, Layout, Shield, AlertCircle, 
  Wifi, Wind, Tv, Coffee, Utensils, Puzzle, Check, Video, ImagePlus, Play,
  Calendar, DollarSign, Clock, Settings2, Info, Sun, Moon, Loader2, Search, Filter,
  Car, Home, TreePine, Dumbbell, Music, Gamepad2, Flame, Snowflake, Droplet, Mountain,
  Camera, Lock, Phone, ParkingCircle, AirVent, Fan, Refrigerator, Microwave, Square,
  ChefHat, Sprout, Bath, Sofa, Armchair, Lamp, Battery, Zap, Star, Heart, Sparkles
} from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

const iconMap: Record<string, any> = {
  Waves, Wifi, Wind, Tv, Coffee, Utensils, Shield, Puzzle,
  Car, Home, TreePine, Dumbbell, Music, Gamepad2, Flame, Snowflake, Droplet, Mountain,
  Camera, Lock, Phone, ParkingCircle, AirVent, Fan, Refrigerator, Microwave, Square,
  ChefHat, Sprout, Bath, Sofa, Armchair, Lamp, Battery, Zap, Star, Heart, Sparkles,
  Bed, Video, Play, Calendar, DollarSign, Clock, Settings2, Info, Sun, Moon
};

const UnitsPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // State declarations - must be before any functions that use them
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'rooms'>('basic');
  const [showSuccessToast, setShowSuccessToast] = useState<string | false>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<ZimmerUnit[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  // Helper function to check if limit is reached for a specific account
  const checkLimitReached = (accountIdToCheck: string | undefined) => {
    if (isAdmin) return false; // Admin has no limit
    
    // Use units from state, fallback to db.units if state is empty
    const unitsToCheck = units.length > 0 ? units : db.units;
    
    // zimmer_owner without accountId - max 1 unit (by userId)
    if (user?.role === UserRole.ZIMMER_OWNER && !accountIdToCheck) {
      const userUnitsCount = unitsToCheck.filter(u => u.userId === user._id || u.userId === user.id).length;
      return userUnitsCount >= 1;
    }
    
    // complex_owner/manager or zimmer_owner with accountId - check account limit
    if (accountIdToCheck) {
      const account = db.accounts.find(a => a.id === accountIdToCheck);
      if (account) {
        const unitsInAccount = unitsToCheck.filter(u => u.accountId === accountIdToCheck).length;
        return unitsInAccount >= account.maxUnits;
      }
    }
    
    return false;
  };

  // Find accounts linked to current user (Account.userId === User.id)
  const userAccounts = db.accounts.filter(a => a.userId === user?.id);
  const firstUserAccount = userAccounts.length > 0 ? userAccounts[0] : undefined;
  
  // Debug: Log user and accounts info
  useEffect(() => {
    if (user) {
      console.log('🔍 [UnitsPage] User loaded:', {
        userId: user.id,
        userRole: user.role,
        userSettingsId: user.userSettingsId,
        accountsInDb: db.accounts.length,
        userAccountsCount: userAccounts.length,
        userAccounts: userAccounts.map(a => ({ id: a.id, name: a.name }))
      });
    }
  }, [user, db.accounts, userAccounts.length]);
  
  // Calculate limit info for non-admin users
  let reachedLimit = false;
  let unitsInAccount = 0;
  let maxAllowed = 0;
  
  if (!isAdmin) {
    if (user?.role === UserRole.ZIMMER_OWNER) {
      // zimmer_owner - max 1 unit (linked to user)
      const userUnitsCount = units.filter(u => 
        u.linkType === 'user' && (u.linkedToId === user._id?.toString() || u.linkedToId === user.id?.toString())
      ).length;
      reachedLimit = userUnitsCount >= 1;
      unitsInAccount = userUnitsCount;
      maxAllowed = 1;
    } else if (firstUserAccount) {
      // complex_owner/manager - use first account maxUnits
      const unitsInAccountCount = units.filter(u => 
        u.linkType === 'account' && u.linkedToId === firstUserAccount.id
      ).length;
      reachedLimit = unitsInAccountCount >= firstUserAccount.maxUnits;
      unitsInAccount = unitsInAccountCount;
      maxAllowed = firstUserAccount.maxUnits;
    } else {
      maxAllowed = 1; // Default fallback
    }
  } else {
    maxAllowed = Infinity;
  }
  
  const [currentUnit, setCurrentUnit] = useState<Partial<ZimmerUnit>>({
    name: '',
    description: '',
    pricePerNight: 0,
    capacity: 2,
    linkType: user?.role === UserRole.ZIMMER_OWNER ? 'user' : 'account',
    linkedToId: user?.role === UserRole.ZIMMER_OWNER ? (user._id?.toString() || user.id?.toString()) : (firstUserAccount?.id || db.accounts[0]?.id),
    accountId: firstUserAccount?.id || db.accounts[0]?.id, // Keep for backward compatibility (deprecated)
    status: UnitStatus.AVAILABLE,
    images: [],
    mainImage: '',
    videoUrl: '',
    facilityIds: [],
    specialPrices: []
  });
  
  const [selectedUserId, setSelectedUserId] = useState<string>(''); // For admin: selected user ID (when creating unit for a user)
  
  const [uploadedFiles, setUploadedFiles] = useState<{file: File, preview: string, type: 'image' | 'video'}[]>([]);

  const [tempRooms, setTempRooms] = useState<Partial<Room>[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Load units, rooms, facilities, and users from API
  useEffect(() => {
    loadUnits();
    loadRooms();
    loadFacilities();
    loadAccounts();
    if (isAdmin) {
      loadUsers();
    }
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await accountsAPI.getAll();
      setAccounts(data || []);
      setDb({ ...db, accounts: data || [] });
    } catch (err: any) {
      console.error('Error loading accounts:', err);
    }
  };

  const loadFacilities = async () => {
    try {
      const data = await facilitiesAPI.getAll();
      setFacilities(data || []);
      // Also update local db for compatibility
      setDb({ ...db, facilities: data || [] });
    } catch (err: any) {
      console.error('Error loading facilities:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data || []);
      // Also update local db for compatibility
      setDb({ ...db, users: data || [] });
    } catch (err: any) {
      console.error('Error loading users:', err);
    }
  };

  const loadUnits = async () => {
    try {
      setLoading(true);
      console.log('🏠 [UnitsPage] Loading units from API...');
      console.log('🏠 [UnitsPage] Current user:', {
        role: user?.role,
        userId: user?.id,
        userSettingsId: user?.userSettingsId
      });
      const data = await unitsAPI.getAll();
      console.log('🏠 [UnitsPage] Units loaded:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🏠 [UnitsPage] Sample units:', data.slice(0, 3).map((u: any) => ({
          id: u.id,
          name: u.name,
          accountId: u.accountId,
          accountIdType: typeof u.accountId,
          userId: u.userId,
          mainImage: u.mainImage,
          imagesCount: u.images?.length || 0,
          images: u.images?.slice(0, 3) || []
        })));
        // Log image URLs to see what's stored in DB
        data.forEach((u: any) => {
          if (u.images && u.images.length > 0) {
            console.log(`🖼️ [UnitsPage] Unit "${u.name}" images from DB:`, u.images);
          }
        });
        const processedData = data.map((u: any) => ({
          ...u,
          mainImage: u.mainImage || (u.images && u.images.length > 0 ? u.images[0] : null)
        }));
        setUnits(processedData || []);
      } else {
        setUnits(data || []);
      }
      // Also update local db for compatibility
      setDb({ ...db, units: data || [] });
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת היחידות');
      console.error('❌ [UnitsPage] Error loading units:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    try {
      const data = await roomsAPI.getAll();
      setRooms(data);
      // Also update local db for compatibility
      setDb({ ...db, rooms: data });
    } catch (err: any) {
      console.error('Error loading rooms:', err);
    }
  };

  const handleOpenAdd = () => {
    // Debug: Log user accountId info
    console.log('🔍 [UnitsPage] handleOpenAdd - User info:', {
      userId: user?.id,
      userRole: user?.role,
      userAccountId: user?.accountId,
      userAccountIdType: typeof user?.accountId,
      accountsInDb: db.accounts.length,
      accountsIds: db.accounts.map(a => a.id)
    });
    
    // Check limit before opening modal
    if (!isAdmin) {
      if (user?.role === UserRole.ZIMMER_OWNER) {
        // zimmer_owner - check if already has 1 unit (linked to user)
        const userUnitsCount = units.filter(u => 
          u.linkType === 'user' && (u.linkedToId === user._id?.toString() || u.linkedToId === user.id?.toString())
        ).length;
        if (userUnitsCount >= 1) {
          setError('בעל צימר יכול להגדיר צימר אחד בלבד.');
          return;
        }
      } else if (user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER) {
        // For complex_owner/manager with multiple accounts, don't block here
        // The limit check will be done in handleSaveUnit based on selected account
        // So we allow opening the modal to let them select which account
      } else if (reachedLimit) {
        setError('המכסה הושלמה! לא ניתן להוסיף עוד צימרים למתחם זה.');
        return;
      }
    }
    
    // For complex_owner/manager: show their account or first available
    // For admin: start with first available account
    // For zimmer_owner without account: no accountId
    // BUT: if currentUnit already has linkedToId/accountId set (from clicking a specific account button),
    // preserve those values instead of resetting to default
    let defaultAccountId: string | undefined;
    let linkType: 'user' | 'account' = 'account';
    let linkedToId: string | undefined;
    
    // Check if currentUnit already has account/linkedToId set (from clicking account-specific button)
    if (currentUnit.linkType === 'account' && currentUnit.linkedToId) {
      // Preserve the selected account
      linkedToId = currentUnit.linkedToId;
      linkType = 'account';
      defaultAccountId = currentUnit.linkedToId;
      console.log('🔍 [UnitsPage] handleOpenAdd - Preserving selected account:', linkedToId);
    } else if (currentUnit.accountId) {
      // Preserve accountId if set
      linkedToId = currentUnit.accountId;
      linkType = 'account';
      defaultAccountId = currentUnit.accountId;
      console.log('🔍 [UnitsPage] handleOpenAdd - Preserving accountId:', defaultAccountId);
    } else {
      // No account pre-selected - use defaults
      if (isAdmin) {
        defaultAccountId = db.accounts[0]?.id;
        linkedToId = defaultAccountId;
      } else if (user?.role === UserRole.ZIMMER_OWNER) {
        defaultAccountId = undefined; // No account for zimmer_owner
        linkType = 'user';
        linkedToId = user._id?.toString() || user.id?.toString();
      } else if (user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER) {
        // For complex_owner, they can add units to any of their accounts
        // If they have accounts, use the first one as default
        if (userAccounts.length > 0) {
          defaultAccountId = firstUserAccount.id;
          linkedToId = defaultAccountId;
          console.log('🔍 [UnitsPage] Complex owner - using first account as default:', defaultAccountId);
        } else {
          // No accounts yet - they need to create one first
          setError('⚠️ אין לך מתחמים. אנא צור מתחם תחילה.');
          console.error('❌ [UnitsPage] Complex owner has no accounts');
          return; // Don't open modal if no accounts
        }
      } else {
        defaultAccountId = firstUserAccount?.id || db.accounts[0]?.id;
        linkedToId = defaultAccountId;
      }
    }
    
    console.log('🔍 [UnitsPage] handleOpenAdd - Final values:', { linkType, linkedToId, defaultAccountId });
    
    setCurrentUnit({
      name: '',
      description: '',
      pricePerNight: 0,
      capacity: 2,
      linkType: linkType,
      linkedToId: linkedToId,
      accountId: defaultAccountId, // Keep for backward compatibility
      status: UnitStatus.AVAILABLE,
      images: [],
      mainImage: '',
      videoUrl: '',
      facilityIds: [],
      specialPrices: [],
      region: undefined
    });
    setSelectedUserId('');
    setUploadedFiles([]);
    const defaultRoom = { id: '1', name: 'חדר מרכזי', room_type: 'bedroom', beds_count: 2, windows_count: 1, facilityIds: [] };
    setTempRooms([defaultRoom]);
    setSelectedRoomId('1');
    setModalMode('add');
    setActiveTab('basic');
    setError(null); // Clear any previous errors
    setShowModal(true);
    setUploadedFiles([]);
  };

  const handleOpenEdit = async (unit: ZimmerUnit) => {
    setCurrentUnit({ 
      ...unit, 
      specialPrices: unit.specialPrices || [],
      mainImage: unit.mainImage || (unit.images && unit.images.length > 0 ? unit.images[0] : '')
    });
    
    if ((unit as any).userId) {
      const userIdStr = (unit as any).userId.toString();
      setSelectedUserId(userIdStr);
    } else {
      setSelectedUserId('');
    }
    try {
      const unitRooms = await roomsAPI.getByUnitId(unit.id!);
      setTempRooms(unitRooms);
      if (unitRooms.length > 0) {
        setSelectedRoomId(unitRooms[0].id);
      }
    } catch (err) {
      // Fallback to local rooms
      const unitRooms = rooms.filter(r => r.lodging_id === unit.id);
      setTempRooms(unitRooms);
      if (unitRooms.length > 0) {
        setSelectedRoomId(unitRooms[0].id);
      }
    }
    setModalMode('edit');
    setActiveTab('basic');
    setShowModal(true);
    setUploadedFiles([]);
  };

  const handleAddSpecialPrice = () => {
    const newSpecial: SpecialPriceConfig = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: '',
      endDate: '',
      pricePerNight: currentUnit.pricePerNight || 0,
      label: 'תמחור עונתי',
      earlyCheckInAllowed: false,
      lateCheckOutAllowed: false,
      minNights: 1
    };
    setCurrentUnit({ ...currentUnit, specialPrices: [...(currentUnit.specialPrices || []), newSpecial] });
  };

  const handleRemoveSpecialPrice = (id: string) => {
    setCurrentUnit({ ...currentUnit, specialPrices: (currentUnit.specialPrices || []).filter(p => p.id !== id) });
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newFiles = files.map((file: File) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        alert('רק קבצי תמונה (PNG, JPG, etc.) או סרטונים (MP4, etc.) נתמכים');
        return null;
      }
      return {
        file,
        preview: URL.createObjectURL(file as Blob),
        type: isImage ? 'image' as const : 'video' as const
      };
    }).filter(f => f !== null) as {file: File, preview: string, type: 'image' | 'video'}[];

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    
    // Don't add blob URLs to currentUnit.images - they will be converted to base64 before saving
  };

  // Remove uploaded file
  const handleRemoveFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    URL.revokeObjectURL(fileToRemove.preview);
    
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    
    // If mainImage was set to this preview, clear it
    if (fileToRemove.type === 'image' && currentUnit.mainImage === fileToRemove.preview) {
      setCurrentUnit({ ...currentUnit, mainImage: '' });
    }
    
    // If videoUrl was set to this preview, clear it
    if (fileToRemove.type === 'video' && currentUnit.videoUrl === fileToRemove.preview) {
      setCurrentUnit({ ...currentUnit, videoUrl: '' });
    }
  };

  const handleSetMainImage = (imageUrl: string) => {
    setCurrentUnit(prev => ({ ...prev, mainImage: imageUrl }));
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Upload file to server and get URL
  const uploadFileToServer = async (file: File): Promise<string> => {
    try {
      console.log(`📤 [UnitsPage] Uploading file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      const base64 = await fileToBase64(file);
      console.log(`📤 [UnitsPage] File converted to base64, length: ${base64.length}`);
      const url = await uploadAPI.uploadFile(base64, file.name, file.type);
      console.log(`✅ [UnitsPage] File uploaded successfully, URL: ${url}`);
      return url;
    } catch (error) {
      console.error(`❌ [UnitsPage] Error uploading file:`, error);
      throw error;
    }
  };


  const handleSaveUnit = async () => {
    if (!currentUnit.name) return;
    
    // Determine userId and accountId based on selection
    let targetUserId: string | undefined;
    let accountId: string | undefined;
    
    if (isAdmin) {
      // Admin can assign to user or account
      if (selectedUserId) {
        // Assigning to a user
        const selectedUser = users.find(u => u.id === selectedUserId);
        if (!selectedUser) {
          setError('יוזר לא נמצא');
          return;
        }
        targetUserId = selectedUser.id;
        
        // Check if user has account
        if (selectedUser.accountId) {
          accountId = selectedUser.accountId;
          // Check account limit
          const account = db.accounts.find(a => a.id === accountId);
          if (account) {
            const unitsInAccount = units.filter(u => u.accountId === accountId).length;
            if (modalMode === 'add' && unitsInAccount >= account.maxUnits) {
              setError(`המכסה הושלמה! יש ${unitsInAccount} צימרים מתוך ${account.maxUnits} מותרים במתחם זה.`);
              return;
            }
          }
        } else {
          // User without account - check if already has a unit (max 1)
          const userUnits = units.filter(u => {
            const unitUserId = u.userId?.toString();
            return unitUserId === selectedUser.id || unitUserId === selectedUser._id?.toString();
          });
          if (modalMode === 'add' && userUnits.length >= 1) {
            setError('ליוזר זה כבר יש צימר. יוזר פרטי יכול להגדיר צימר אחד בלבד.');
            return;
          }
          accountId = undefined;
        }
      } else if (currentUnit.accountId) {
        // Assigning to account only
        accountId = currentUnit.accountId;
        // Check account limit
        const account = db.accounts.find(a => a.id === accountId);
        if (account) {
          const unitsInAccount = units.filter(u => u.accountId === accountId).length;
          if (modalMode === 'add' && unitsInAccount >= account.maxUnits) {
            setError(`המכסה הושלמה! יש ${unitsInAccount} צימרים מתוך ${account.maxUnits} מותרים במתחם זה.`);
            return;
          }
        }
      } else {
        setError('יש לבחור יוזר או מתחם להוספת יחידה');
        return;
      }
    } else if (user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER) {
      // complex_owner/manager - use selected account or first account
      if (userAccounts.length === 0) {
        setError('אין לך מתחם משויך. אנא צור מתחם תחילה.');
        console.error('❌ [UnitsPage] Complex owner/manager has no accounts');
        return;
      }
      
      // Use currentUnit.linkedToId (if linkType is 'account') or currentUnit.accountId, or first account
      console.log('🔍 [UnitsPage] handleSaveUnit - currentUnit:', {
        linkType: currentUnit.linkType,
        linkedToId: currentUnit.linkedToId,
        accountId: currentUnit.accountId,
        userAccounts: userAccounts.map(a => ({ id: a.id, name: a.name }))
      });
      
      if (currentUnit.linkType === 'account' && currentUnit.linkedToId) {
        // Check if the linkedToId is one of user's accounts
        const selectedAccount = userAccounts.find(a => a.id === currentUnit.linkedToId);
        if (selectedAccount) {
          accountId = selectedAccount.id;
          console.log('✅ [UnitsPage] Using linkedToId account:', accountId, selectedAccount.name);
        } else {
          // Fallback to first account if linkedToId is not valid
          accountId = firstUserAccount.id;
          console.log('⚠️ [UnitsPage] linkedToId not found in userAccounts, using first account:', accountId);
        }
      } else if (currentUnit.accountId) {
        // Check if the accountId is one of user's accounts
        const selectedAccount = userAccounts.find(a => a.id === currentUnit.accountId);
        if (selectedAccount) {
          accountId = selectedAccount.id;
          console.log('✅ [UnitsPage] Using accountId account:', accountId, selectedAccount.name);
        } else {
          // Fallback to first account if accountId is not valid
          accountId = firstUserAccount.id;
          console.log('⚠️ [UnitsPage] accountId not found in userAccounts, using first account:', accountId);
        }
      } else {
        // No account selected - use first account
        accountId = firstUserAccount.id;
        console.log('⚠️ [UnitsPage] No account selected, using first account:', accountId);
      }
      
      targetUserId = user.id || user._id?.toString();
      
      if (!targetUserId) {
        setError('שגיאה: לא ניתן לזהות את המשתמש');
        return;
      }
      
      // Check account limit for the SELECTED account (not just first account)
      if (modalMode === 'add') {
        const selectedAccount = db.accounts.find(a => a.id === accountId);
        console.log('🔍 [UnitsPage] Checking limit for account:', {
          accountId: accountId,
          accountName: selectedAccount?.name,
          maxUnits: selectedAccount?.maxUnits
        });
        
        if (selectedAccount) {
          // Count units linked to this specific account using linkType and linkedToId
          const unitsInSelectedAccount = units.filter(u => 
            u.linkType === 'account' && u.linkedToId === accountId
          );
          
          console.log('🔍 [UnitsPage] Units in selected account:', {
            accountId: accountId,
            accountName: selectedAccount.name,
            unitsCount: unitsInSelectedAccount.length,
            maxUnits: selectedAccount.maxUnits,
            units: unitsInSelectedAccount.map(u => ({ id: u.id, name: u.name, linkType: u.linkType, linkedToId: u.linkedToId }))
          });
          
          if (unitsInSelectedAccount.length >= selectedAccount.maxUnits) {
            setError(`המכסה הושלמה! יש ${unitsInSelectedAccount.length} צימרים מתוך ${selectedAccount.maxUnits} מותרים במתחם זה.`);
            return;
          }
        }
      }
    } else if (user?.role === UserRole.ZIMMER_OWNER) {
      // zimmer_owner - automatically use their userId
      targetUserId = user.id || user._id?.toString();
      
      if (!targetUserId) {
        setError('שגיאה: לא ניתן לזהות את המשתמש');
        return;
      }
      
      // zimmer_owner - no account, only userId (already set above)
      // Check limit: max 1 unit for zimmer_owner
      if (modalMode === 'add') {
        const userUnits = units.filter(u => 
          u.linkType === 'user' && (u.linkedToId === targetUserId || u.linkedToId === user.id?.toString() || u.linkedToId === user._id?.toString())
        );
        if (userUnits.length >= 1) {
          setError('לא ניתן להוסיף יותר מצימר אחד. בעל צימר יכול להגדיר צימר אחד בלבד.');
          return;
        }
      }
    } else {
      setError('אין הרשאה ליצור יחידה');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Upload new files to server
      const existingImages = (currentUnit.images || []).filter(img => img && !img.startsWith('blob:'));
      const newImageFiles = uploadedFiles.filter(uf => uf.type === 'image');
      const newVideoFile = uploadedFiles.find(uf => uf.type === 'video');
      
      // Upload new image files to server
      const uploadedImageUrls = await Promise.all(
        newImageFiles.map(file => uploadFileToServer(file.file))
      );
      
      // Upload video file to server if exists
      const uploadedVideoUrl = newVideoFile ? await uploadFileToServer(newVideoFile.file) : null;
      
      // Combine existing images (URLs) with newly uploaded image URLs
      const allImages = [...existingImages, ...uploadedImageUrls];
      
      // Determine main image
      let mainImage = currentUnit.mainImage;
      if (!mainImage || mainImage.startsWith('blob:')) {
        // If mainImage is blob or doesn't exist, use first available image
        mainImage = allImages.length > 0 ? allImages[0] : null;
      }
      
      // If mainImage was set to a blob preview, find the corresponding uploaded URL
      if (mainImage && mainImage.startsWith('blob:')) {
        const blobIndex = uploadedFiles.findIndex(uf => uf.preview === mainImage && uf.type === 'image');
        if (blobIndex !== -1) {
          const imageIndex = uploadedFiles.slice(0, blobIndex).filter(uf => uf.type === 'image').length;
          mainImage = uploadedImageUrls[imageIndex] || allImages[0] || null;
        }
      }
      
      // Determine linkType and linkedToId based on user role and accountId
      let finalLinkType: 'user' | 'account' = 'account';
      let finalLinkedToId: string | undefined = accountId;
      
      if (user?.role === UserRole.ZIMMER_OWNER && !accountId) {
        // zimmer_owner without account - link to user
        finalLinkType = 'user';
        finalLinkedToId = targetUserId || user?.id || user?._id?.toString();
      } else if (accountId) {
        // complex_owner/manager or admin with account - link to account
        finalLinkType = 'account';
        finalLinkedToId = accountId;
      } else if (currentUnit.linkType && currentUnit.linkedToId) {
        // Use values from currentUnit if set
        finalLinkType = currentUnit.linkType;
        finalLinkedToId = currentUnit.linkedToId;
      }
      
      console.log('🔍 [UnitsPage] Preparing unitData:', {
        finalLinkType,
        finalLinkedToId,
        accountId,
        targetUserId,
        currentUnitLinkType: currentUnit.linkType,
        currentUnitLinkedToId: currentUnit.linkedToId
      });
      
      // Prepare unit data
      const unitData: any = {
        linkType: finalLinkType, // New: linkType field
        linkedToId: finalLinkedToId, // New: linkedToId field
        userId: targetUserId || user?.id || user?._id?.toString(), // Keep for backward compatibility
        accountId: accountId || undefined, // Keep for backward compatibility (deprecated)
        name: currentUnit.name!,
        description: currentUnit.description || '',
        pricePerNight: Number(currentUnit.pricePerNight) || 0,
        capacity: Number(currentUnit.capacity) || 2,
        status: (currentUnit.status as string) || 'available',
        images: allImages,
        mainImage: mainImage,
        videoUrl: uploadedVideoUrl || (currentUnit.videoUrl && !currentUnit.videoUrl.startsWith('blob:') ? currentUnit.videoUrl : ''),
        facilityIds: currentUnit.facilityIds || [],
        region: currentUnit.region || null,
        specialPrices: (currentUnit.specialPrices || []).map(sp => ({
          startDate: sp.startDate,
          endDate: sp.endDate,
          pricePerNight: sp.pricePerNight,
          label: sp.label,
          earlyCheckInAllowed: sp.earlyCheckInAllowed,
          lateCheckOutAllowed: sp.lateCheckOutAllowed,
          minNights: sp.minNights
        }))
      };

      let savedUnit: any;
      
      if (modalMode === 'add') {
        // Create new unit - MongoDB will create _id automatically
        savedUnit = await unitsAPI.create(unitData);
      } else {
        // Update existing unit - validate limits if accountId changed
        const oldUnit = units.find(u => u.id === currentUnit.id);
        if (oldUnit && accountId && oldUnit.accountId !== accountId) {
          // Account changed - check new account limit
          const account = db.accounts.find(a => a.id === accountId);
          if (account) {
            const unitsInAccount = units.filter(u => u.accountId === accountId && u.id !== currentUnit.id).length;
            if (unitsInAccount >= account.maxUnits) {
              setError(`המכסה הושלמה! יש ${unitsInAccount} צימרים מתוך ${account.maxUnits} מותרים במתחם זה.`);
              return;
            }
          }
        }
        // Update existing unit - MongoDB uses existing _id
        savedUnit = await unitsAPI.update(currentUnit.id!, unitData);
      }

      // Save rooms - normalize the unit ID
      const unitId = savedUnit.id || savedUnit._id?.toString() || savedUnit._id;
      
      // Delete old rooms for this unit (if editing)
      if (modalMode === 'edit' && currentUnit.id) {
        const existingRooms = await roomsAPI.getByUnitId(currentUnit.id);
        for (const room of existingRooms) {
          try {
            await roomsAPI.delete(room.id || room._id);
          } catch (err) {
            console.error('Error deleting room:', err);
          }
        }
      }

      // Create new rooms
      for (const roomData of tempRooms) {
        const roomPayload: any = {
          lodging_id: unitId,
          name: roomData.name || 'חדר',
          room_type: (roomData.room_type || 'bedroom') as string,
          beds_count: Number(roomData.beds_count) || 0,
          windows_count: Number(roomData.windows_count) || 0,
          facilityIds: roomData.facilityIds || [] // Many-to-many relationship with Facilities
        };
        await roomsAPI.create(roomPayload);
      }

      // Reload data to get updated counts
      await loadUnits();
      await loadRooms();
      
      // Show success message with remaining units info
      let successMessage = modalMode === 'add' ? 'הצימר נוסף בהצלחה!' : 'השינויים נשמרו!';
      
      // Add remaining units info for non-admin users
      if (!isAdmin) {
        if (user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER) {
          const account = db.accounts.find(a => a.id === accountId);
          if (account) {
            const updatedUnits = await unitsAPI.getAll();
            const unitsInAccount = updatedUnits.filter((u: any) => u.accountId === accountId).length;
            const remaining = account.maxUnits - unitsInAccount;
            successMessage += ` נשארו ${remaining} צימרים מתוך ${account.maxUnits} מותרים במתחם.`;
          }
        } else if (user?.role === UserRole.ZIMMER_OWNER && !user.accountId) {
          const updatedUnits = await unitsAPI.getAll();
          const userUnits = updatedUnits.filter((u: any) => {
            const unitUserId = u.userId?.toString();
            return unitUserId === targetUserId;
          });
          if (userUnits.length >= 1) {
            successMessage += ' זה הצימר היחיד שלך (בעל צימר ללא מתחם יכול להגדיר צימר אחד בלבד).';
          }
        }
      }
      
      // Clean up uploaded files and blob URLs
      uploadedFiles.forEach(file => {
        URL.revokeObjectURL(file.preview);
      });
      setUploadedFiles([]);
      
      setShowModal(false);
      setShowSuccessToast(successMessage);
      setTimeout(() => setShowSuccessToast(false), 5000); // Longer timeout to read the message
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת היחידה');
      console.error('Error saving unit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    // Get unit info before deletion for message
    const unitToDelete = units.find(u => u.id === unitId);
    
    if (!confirm('האם אתה בטוח שברצונך למחוק יחידה זו? פעולה זו תמחק גם את כל החדרים הקשורים.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Delete all rooms for this unit first
      const unitRooms = await roomsAPI.getByUnitId(unitId);
      for (const room of unitRooms) {
        try {
          const roomId = room.id || room._id?.toString() || room._id;
          await roomsAPI.delete(roomId);
        } catch (err) {
          console.error('Error deleting room:', err);
        }
      }

      // Delete the unit
      await unitsAPI.delete(unitId);

      // Reload data to get updated counts
      await loadUnits();
      await loadRooms();
      
      // Show success message with remaining units info
      let successMessage = 'הצימר נמחק בהצלחה!';
      
      // Add remaining units info for non-admin users
      if (!isAdmin && unitToDelete) {
        if (user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER) {
          const accountId = unitToDelete.accountId;
          if (accountId) {
            const account = db.accounts.find(a => a.id === accountId);
            if (account) {
              const updatedUnits = await unitsAPI.getAll();
              const unitsInAccount = updatedUnits.filter((u: any) => u.accountId === accountId).length;
              const remaining = account.maxUnits - unitsInAccount;
              successMessage += ` נשארו ${remaining} צימרים מתוך ${account.maxUnits} מותרים במתחם.`;
            }
          }
        } else if (user?.role === UserRole.ZIMMER_OWNER && !user.accountId) {
          const updatedUnits = await unitsAPI.getAll();
          const userUnits = updatedUnits.filter((u: any) => {
            const unitUserId = u.userId?.toString();
            const currentUserId = user.id || user._id?.toString();
            return unitUserId === currentUserId;
          });
          if (userUnits.length === 0) {
            successMessage += ' כעת אין לך צימרים. אתה יכול ליצור צימר אחד.';
          } else {
            successMessage += ' זה הצימר היחיד שלך (בעל צימר ללא מתחם יכול להגדיר צימר אחד בלבד).';
          }
        }
      }
      
      setShowSuccessToast(successMessage);
      setTimeout(() => setShowSuccessToast(false), 5000); // Longer timeout to read the message
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת היחידה');
      console.error('Error deleting unit:', err);
    } finally {
      setLoading(false);
    }
  };

  // Backend already filters units based on UserSettings
  // So we just need to filter for zimmer_owner (by userId) if needed
  const baseDisplayedUnits = isAdmin 
    ? units 
    : user?.role === UserRole.ZIMMER_OWNER
    ? units.filter(u => {
        // Match by linkType='user' and linkedToId
        if (u.linkType === 'user') {
          const unitLinkedToId = u.linkedToId?.toString();
          const currentUserId = user._id?.toString() || user.id?.toString();
          return unitLinkedToId === currentUserId;
        }
        return false;
      })
    : units; // For complex_owner, backend already filtered by accounts

  // Apply search and filters
  const displayedUnits = baseDisplayedUnits.filter(unit => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        unit.name.toLowerCase().includes(query) ||
        unit.description.toLowerCase().includes(query) ||
        unit.region?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Region filter
    if (filterRegion && unit.region !== filterRegion) {
      return false;
    }

    // Status filter
    if (filterStatus && unit.status !== filterStatus) {
      return false;
    }

    return true;
  });

  // Debug log for complex_owner/manager
  useEffect(() => {
    if (user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER) {
      console.log('🏠 [UnitsPage] Complex owner/manager units:', {
        totalUnits: units.length,
        displayedUnits: displayedUnits.length,
        userAccountId: user.accountId,
        userAccountIdType: typeof user.accountId,
        unitsAccountIds: units.map((u: any) => ({
          unitId: u.id,
          accountId: u.accountId,
          accountIdType: typeof u.accountId
        }))
      });
    }
  }, [units, displayedUnits, user?.role, user?.accountId]);

  // Facilities are global - no filtering needed
  const accountFacilities = facilities;

  return (
    <div className="space-y-8 animate-fadeIn relative text-right">
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-white/20 max-w-md">
          <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
          <span className="font-bold text-sm leading-relaxed">{showSuccessToast}</span>
        </div>
      )}

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-rose-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-white/20">
          <AlertCircle size={20} />
          <span className="font-bold">{error}</span>
          <button onClick={() => setError(null)} className="ml-4">
            <X size={16} />
          </button>
        </div>
      )}

      {loading && !showModal && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* הצגת מכסה - רק לבעל צימר */}
            {!isAdmin && user?.role === UserRole.ZIMMER_OWNER && (
               <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${reachedLimit ? 'text-rose-500 bg-rose-50 border-rose-100' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                  {reachedLimit ? <AlertCircle size={16} /> : <Check size={16} className="text-emerald-500" />}
                  <span className="text-xs font-bold">שימוש במכסה: {unitsInAccount} מתוך {maxAllowed}</span>
               </div>
            )}
            
            {/* כפתור הוספת צימר - רק אם לא בעל מתחם (כי לבעל מתחם יש כפתורים בכל מתחם) */}
            {user?.role !== UserRole.COMPLEX_OWNER && (isAdmin || !reachedLimit) && (
              <button 
                onClick={handleOpenAdd}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-slate-200"
              >
                <Plus size={18} />
                {t.add_unit}
              </button>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.units}</h2>
            <p className="text-slate-500 font-medium">ניהול מפרט יחידות, תמחור עונתי ומדיה.</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="חיפוש לפי שם, תיאור או איזור..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 pr-12 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none transition-all"
              />
            </div>

            {/* Region Filter */}
            <div className="relative">
              <Filter size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filterRegion}
                onChange={e => setFilterRegion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 pr-12 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none transition-all appearance-none"
              >
                <option value="">כל האיזורים</option>
                <option value="צפון">צפון</option>
                <option value="דרום">דרום</option>
                <option value="מרכז">מרכז</option>
                <option value="השפלה">השפלה</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 pr-12 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none transition-all appearance-none"
              >
                <option value="">כל הסטטוסים</option>
                <option value="available">זמין</option>
                <option value="occupied">תפוס</option>
                <option value="cleaning">ניקוי</option>
                <option value="maintenance">תחזוקה</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          {(searchQuery || filterRegion || filterStatus) && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-bold">
                נמצאו {displayedUnits.length} צימרים מתוך {baseDisplayedUnits.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* הצגת צימרים מחולקים לפי מתחם - רק לבעל מתחם */}
      {user?.role === UserRole.COMPLEX_OWNER && accounts.length > 0 ? (
        // בעל מתחם - הצגה מחולקת לפי מתחם
        <div className="space-y-8">
          {accounts.map((account) => {
            const accountUnits = displayedUnits.filter((u: any) => 
              u.linkType === 'account' && u.linkedToId === account.id
            );
            const unitsInAccount = accountUnits.length;
            const canAddUnit = unitsInAccount < account.maxUnits;
            
            return (
              <div key={account.id} className="bg-white rounded-[2.5rem] border-2 border-indigo-200 shadow-lg overflow-hidden">
                {/* כותרת המתחם */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 mb-1">{account.name}</h3>
                      <p className="text-sm text-slate-600 font-bold">
                        {unitsInAccount} מתוך {account.maxUnits} צימרים
                        {canAddUnit && (
                          <span className="text-emerald-600 mr-2">• ניתן להוסיף</span>
                        )}
                        {!canAddUnit && (
                          <span className="text-rose-600 mr-2">• מכסה מלאה</span>
                        )}
                      </p>
                    </div>
                    {canAddUnit && (
                      <button
                        onClick={() => {
                          setCurrentUnit({
                            ...currentUnit,
                            linkType: 'account',
                            linkedToId: account.id,
                            accountId: account.id
                          });
                          handleOpenAdd();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md"
                      >
                        <Plus size={18} />
                        הוסף צימר למתחם
                      </button>
                    )}
                  </div>
                </div>
                
                {/* צימרים של המתחם */}
                <div className="p-6">
                  {accountUnits.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Home size={48} className="mx-auto mb-3 opacity-50" />
                      <p className="font-bold">אין צימרים במתחם זה</p>
                      {canAddUnit && (
                        <button
                          onClick={() => {
                            setCurrentUnit({
                              ...currentUnit,
                              linkType: 'account',
                              linkedToId: account.id,
                              accountId: account.id
                            });
                            handleOpenAdd();
                          }}
                          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md mx-auto"
                        >
                          <Plus size={18} />
                          הוסף צימר ראשון
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {accountUnits.map((unit) => (
                        <div key={unit.id} className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all group flex flex-col">
                          <div className="h-52 relative overflow-hidden bg-slate-100">
                            {(() => {
                              const getValidImageUrl = () => {
                                if (unit.mainImage && unit.mainImage.trim() !== '' && !unit.mainImage.startsWith('blob:')) {
                                  return fixImageUrl(unit.mainImage);
                                }
                                if (unit.images && unit.images.length > 0) {
                                  const validImage = unit.images.find(img => img && img.trim() !== '' && !img.startsWith('blob:'));
                                  if (validImage) return fixImageUrl(validImage);
                                }
                                return null;
                              };
                              const imageUrl = getValidImageUrl();
                              return imageUrl ? (
                                <img 
                                  src={imageUrl}
                                  alt={unit.name} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : null;
                            })()}
                            <div className="absolute top-4 right-4">
                              <span className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md bg-white/90 text-slate-600`}>
                                {unit.status}
                              </span>
                            </div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex gap-2 text-slate-400">
                                <Edit2 size={18} className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleOpenEdit(unit)} />
                                <Trash2 size={18} className="cursor-pointer hover:text-rose-600 transition-colors" onClick={() => handleDeleteUnit(unit.id!)} />
                              </div>
                              <h3 className="text-lg font-black text-slate-800 tracking-tight">{unit.name}</h3>
                            </div>
                            <p className="text-slate-500 text-sm font-medium mb-4 line-clamp-2 leading-relaxed">{unit.description}</p>
                            {unit.region && (
                              <div className="mb-4">
                                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                  {unit.region}
                                </span>
                              </div>
                            )}
                            <div className="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between">
                              <div className="font-black text-slate-800 text-sm">₪{unit.pricePerNight}</div>
                              <div className="flex items-center gap-1.5">
                                <Bed size={14} className="text-emerald-500" />
                                <span className="text-xs font-bold text-slate-600">{unit.capacity}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // אדמין או בעל צימר - תצוגה רגילה
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedUnits.map((unit) => (
          <div key={unit.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col">
            <div className="h-52 relative overflow-hidden bg-slate-100">
              {(() => {
                const getValidImageUrl = () => {
                  // Check mainImage first
                  if (unit.mainImage && unit.mainImage.trim() !== '' && !unit.mainImage.startsWith('blob:')) {
                    return fixImageUrl(unit.mainImage);
                  }
                  // Check images array
                  if (unit.images && unit.images.length > 0) {
                    const validImage = unit.images.find(img => img && img.trim() !== '' && !img.startsWith('blob:'));
                    if (validImage) {
                      return fixImageUrl(validImage);
                    }
                  }
                  return null;
                };
                 const imageUrl = getValidImageUrl();
                 if (imageUrl) {
                   console.log('🖼️ [UnitsPage] Image URL:', imageUrl);
                 }
                
                return imageUrl ? (
                  
                  <img 
                    src={imageUrl}
                    alt={unit.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    onError={(e) => {
                      console.error('Failed to load image:', imageUrl);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : null;
              })()}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <span className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md bg-white/90 text-slate-600`}>
                  {unit.status}
                </span>
              </div>
              <div className={`absolute bottom-4 ${t.dir === 'rtl' ? 'right-4' : 'left-4'} flex gap-1.5`}>
                 {unit.specialPrices && unit.specialPrices.length > 0 && (
                   <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center border border-white/30" title="מחירון עונתי פעיל">
                     <DollarSign size={14} />
                   </div>
                 )}
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2 text-slate-400">
                  <Edit2 size={18} className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleOpenEdit(unit)} />
                  <Trash2 size={18} className="cursor-pointer hover:text-rose-600 transition-colors" onClick={() => handleDeleteUnit(unit.id!)} />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{unit.name}</h3>
              </div>
              {isAdmin && ((unit as any).userId || unit.accountId) && (
                <div className="mb-3">
                  {(() => {
                    const unitUserId = (unit as any).userId?.toString();
                    const unitUser = unitUserId ? users.find(u => u.id === unitUserId || u._id?.toString() === unitUserId) : null;
                    const unitAccount = unit.accountId ? db.accounts.find(a => a.id === unit.accountId) : null;
                    if (unitUser) {
                      const accountName = unitUser.accountId ? db.accounts.find(a => a.id === unitUser.accountId)?.name : null;
                      return (
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold">
                          {unitUser.name} ({unitUser.role === UserRole.ZIMMER_OWNER ? 'בעל צימר' : unitUser.role === UserRole.COMPLEX_OWNER ? 'בעל מתחם' : 'מנהל'}){accountName ? ` - ${accountName}` : ''}
                        </span>
                      );
                    } else if (unitAccount) {
                      return (
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold">
                          {unitAccount.name} (מתחם)
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              <p className="text-slate-500 text-sm font-medium mb-4 line-clamp-2 leading-relaxed">{unit.description}</p>
              
              {unit.region && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                    {unit.region}
                  </span>
                </div>
              )}
              
              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                   <div className="font-black text-slate-800 text-sm">₪{unit.pricePerNight}</div>
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Bed size={14} className="text-emerald-500" />
                        <span className="text-xs font-bold text-slate-600">{unit.capacity}</span>
                      </div>
                   </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center p-2 sm:p-4" style={{ paddingRight: '280px' }}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="bg-white w-full max-w-6xl h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh] rounded-2xl sm:rounded-[3rem] shadow-2xl relative z-[10000] overflow-hidden animate-scaleIn flex flex-col mx-auto">
            
            {/* Modal Header - Fixed */}
            <div className="flex-shrink-0 px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-slate-100 flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                  <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all flex-shrink-0">
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 tracking-tight truncate">
                    {modalMode === 'add' ? 'הוספת יחידה חדשה' : `עריכת יחידה: ${currentUnit.name}`}
                  </h3>
                </div>
              </div>
              
              {/* Tabs - Responsive */}
              <div className="flex bg-slate-50 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl gap-1 w-full overflow-x-auto custom-scrollbar">
                 <button 
                  onClick={() => setActiveTab('basic')} 
                  className={`flex-shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all whitespace-nowrap ${activeTab === 'basic' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   מפרט בסיסי
                 </button>
                 <button 
                  onClick={() => setActiveTab('rooms')} 
                  className={`flex-shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all whitespace-nowrap ${activeTab === 'rooms' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   חדרים ומתקנים
                 </button>
                 <button 
                  onClick={() => setActiveTab('pricing')} 
                  className={`flex-shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all whitespace-nowrap ${activeTab === 'pricing' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   מחירון ותנאים
                 </button>
              </div>
            </div>
            
            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar bg-slate-50/20 min-h-0">
              {activeTab === 'basic' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 animate-fadeIn pb-4">
                   <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 space-y-4 sm:space-y-6 shadow-sm">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3 flex items-center gap-2">
                         <Info size={14} /> פרטים כלליים
                      </h4>
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1">{t.name}</label>
                          <input type="text" value={currentUnit.name} onChange={e => setCurrentUnit({...currentUnit, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1">{t.price_per_night}</label>
                            <input type="number" value={currentUnit.pricePerNight} onChange={e => setCurrentUnit({...currentUnit, pricePerNight: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1">{t.capacity}</label>
                            <input type="number" value={currentUnit.capacity} onChange={e => setCurrentUnit({...currentUnit, capacity: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1">איזור</label>
                          <select
                            value={currentUnit.region || ''}
                            onChange={e => setCurrentUnit({...currentUnit, region: e.target.value as 'צפון' | 'דרום' | 'מרכז' | 'השפלה' || undefined})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                          >
                            <option value="">בחר איזור</option>
                            <option value="צפון">צפון</option>
                            <option value="דרום">דרום</option>
                            <option value="מרכז">מרכז</option>
                            <option value="השפלה">השפלה</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1">{t.description}</label>
                          <textarea value={currentUnit.description} onChange={e => setCurrentUnit({...currentUnit, description: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium h-32 leading-relaxed focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                        </div>
                        {isAdmin && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1">שיוך - יוזר או מתחם *</label>
                            <select 
                              value={selectedUserId ? `user_${selectedUserId}` : (currentUnit.accountId ? `account_${currentUnit.accountId}` : '')} 
                              onChange={e => {
                                const value = e.target.value;
                                if (value.startsWith('user_')) {
                                  const userId = value.replace('user_', '');
                                  setSelectedUserId(userId);
                                  setCurrentUnit({...currentUnit, accountId: undefined});
                                } else if (value.startsWith('account_')) {
                                  const accountId = value.replace('account_', '');
                                  setSelectedUserId('');
                                  setCurrentUnit({...currentUnit, accountId: accountId});
                                } else {
                                  setSelectedUserId('');
                                  setCurrentUnit({...currentUnit, accountId: undefined});
                                }
                              }} 
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            >
                              <option value="">בחר יוזר או מתחם</option>
                              <optgroup label="יוזרים">
                                {users
                                  .filter(u => u.role === UserRole.ZIMMER_OWNER || u.role === UserRole.COMPLEX_OWNER || u.role === UserRole.MANAGER)
                                  .map(u => {
                                    const accountName = u.accountId ? db.accounts.find(a => a.id === u.accountId)?.name : null;
                                    return (
                                      <option key={`user_${u.id}`} value={`user_${u.id}`}>
                                        {u.name} ({u.role === UserRole.ZIMMER_OWNER ? 'בעל צימר' : u.role === UserRole.COMPLEX_OWNER ? 'בעל מתחם' : 'מנהל'}) {accountName ? `- ${accountName}` : '- פרטי'}
                                      </option>
                                    );
                                  })}
                              </optgroup>
                              <optgroup label="מתחמים">
                                {db.accounts.map(account => (
                                  <option key={`account_${account.id}`} value={`account_${account.id}`}>
                                    {account.name || `מתחם ${account.id}`} (מכסה: {account.maxUnits})
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        )}
                        {(user?.role === UserRole.COMPLEX_OWNER || user?.role === UserRole.MANAGER) && !isAdmin && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1">חשבון/מתחם *</label>
                            {userAccounts.length > 1 ? (
                              // Multiple accounts - show select dropdown
                              <select
                                value={currentUnit.linkType === 'account' ? (currentUnit.linkedToId || currentUnit.accountId || '') : ''}
                                onChange={e => {
                                  const selectedAccountId = e.target.value;
                                  const selectedAccount = userAccounts.find(a => a.id === selectedAccountId);
                                  if (selectedAccount) {
                                    setCurrentUnit({
                                      ...currentUnit,
                                      linkType: 'account',
                                      linkedToId: selectedAccountId,
                                      accountId: selectedAccountId // Keep for backward compatibility
                                    });
                                  }
                                }}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                              >
                                <option value="">בחר מתחם</option>
                                {userAccounts.map(account => {
                                  const unitsInAccount = units.filter(u => 
                                    u.linkType === 'account' && u.linkedToId === account.id
                                  ).length;
                                  const canAdd = unitsInAccount < account.maxUnits;
                                  return (
                                    <option key={account.id} value={account.id}>
                                      {account.name} ({unitsInAccount}/{account.maxUnits} {canAdd ? '• ניתן להוסיף' : '• מלא'})
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              // Single account - show read-only display
                              <>
                                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-600">
                                  {firstUserAccount?.name || 'לא משויך למתחם'} (אוטומטי)
                                </div>
                                <p className="text-xs text-slate-400 mt-1 mr-1">
                                  {firstUserAccount 
                                    ? 'הצימר יקושר אוטומטית למתחם שלך' 
                                    : '⚠️ אין לך מתחם משויך. אנא צור מתחם תחילה.'}
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                   </div>
                   <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 space-y-4 sm:space-y-6 shadow-sm">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3 flex items-center gap-2">
                         <ImagePlus size={14} /> מדיה וסרטונים
                      </h4>
                      <div className="space-y-4 sm:space-y-6">
                        {/* File Upload */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">
                            העלה תמונות או סרטונים מהמחשב
                          </label>
                          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                            <input
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <ImagePlus size={32} className="mx-auto text-slate-400 mb-2" />
                              <p className="text-sm font-bold text-slate-600 mb-1">לחץ להעלאת קבצים</p>
                              <p className="text-xs text-slate-400">PNG, JPG, MP4 ופורמטים נוספים</p>
                            </label>
                          </div>
                        </div>

                        {/* Uploaded Images Preview */}
                        {(() => {
                          const existingImages = (currentUnit.images || []).filter(img => img && !img.startsWith('blob:'));
                          const newImageFiles = uploadedFiles.filter(uf => uf.type === 'image');
                          const allImages = [...existingImages, ...newImageFiles.map(uf => uf.preview)];
                          
                          if (allImages.length === 0) return null;
                          
                          return (
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">
                                תמונות שהועלו
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {allImages.map((imageUrl, index) => {
                                  const isMain = currentUnit.mainImage === imageUrl;
                                  const isNewFile = imageUrl.startsWith('blob:');
                                  // Fix URL for existing images (not blob URLs)
                                  const fixedUrl = isNewFile ? imageUrl : fixImageUrl(imageUrl) || imageUrl;
                                  console.log(`🖼️ [UnitsPage] Displaying image ${index + 1}:`, { 
                                    original: imageUrl, 
                                    fixed: fixedUrl, 
                                    isNewFile, 
                                    isMain 
                                  });
                                  return (
                                    <div key={`${imageUrl}-${index}`} className="relative group">
                                      <img 
                                        src={fixedUrl} 
                                        alt={`Image ${index + 1}`}
                                        className="w-full h-24 object-cover rounded-xl border-2 transition-all"
                                        style={{ borderColor: isMain ? '#4f46e5' : '#e2e8f0' }}
                                        onError={(e) => {
                                          const imgElement = e.target as HTMLImageElement;
                                          const errorCount = parseInt(imgElement.dataset.errorCount || '0');
                                          
                                          console.error(`❌ [UnitsPage] Failed to load image (attempt ${errorCount + 1}):`, {
                                            original: imageUrl,
                                            fixed: fixedUrl,
                                            attempted: imgElement.src,
                                            currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
                                            errorCount: errorCount
                                          });
                                          
                                          // Only retry once
                                          if (errorCount < 1 && !fixedUrl.startsWith('blob:') && !fixedUrl.startsWith('data:')) {
                                            imgElement.dataset.errorCount = '1';
                                            
                                            // Try adding a cache-busting parameter
                                            const separator = fixedUrl.includes('?') ? '&' : '?';
                                            const retryUrl = `${fixedUrl}${separator}_retry=${Date.now()}`;
                                            console.log(`🔄 [UnitsPage] Retrying with cache-busting: ${retryUrl}`);
                                            imgElement.src = retryUrl;
                                            return;
                                          }
                                          
                                          // Show a simple gray placeholder without text
                                          imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UyZThmMCIvPjxwYXRoIGQ9Ik0gODAgNjAgTCAxMjAgMTAwIEwgODAgMTQwIEwgNDAgMTAwIFoiIGZpbGw9IiM5NDk5YTUiIG9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==';
                                        }}
                                        onLoad={() => {
                                          console.log(`✅ [UnitsPage] Image loaded successfully: ${fixedUrl}`);
                                        }}
                                      />
                                      {isNewFile && (
                                        <div className="absolute top-1 right-1 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                          חדש
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all flex items-center justify-center gap-1">
                                        {!isMain && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              handleSetMainImage(imageUrl);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold transition-opacity hover:bg-indigo-700"
                                          >
                                            תמונה ראשית
                                          </button>
                                        )}
                                        {isMain && (
                                          <span className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold transition-opacity">
                                            ✓ ראשית
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => {
                                          if (isNewFile) {
                                            // Remove from uploadedFiles
                                            const fileIndex = uploadedFiles.findIndex(uf => uf.preview === imageUrl);
                                            if (fileIndex !== -1) {
                                              handleRemoveFile(fileIndex);
                                            }
                                          } else {
                                            // Remove from existing images
                                            const newImages = existingImages.filter((_, i) => i !== index - newImageFiles.length);
                                            setCurrentUnit({ 
                                              ...currentUnit, 
                                              images: newImages,
                                              mainImage: isMain ? (newImages[0] || '') : currentUnit.mainImage
                                            });
                                          }
                                        }}
                                        className="absolute top-1 left-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Video URL (for external videos like YouTube) */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1">
                            קישור וידאו חיצוני (YouTube/Vimeo)
                          </label>
                          <input 
                            type="text" 
                            value={currentUnit.videoUrl || ''} 
                            onChange={e => setCurrentUnit({...currentUnit, videoUrl: e.target.value})} 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none" 
                            placeholder="https://youtube.com/..." 
                          />
                        </div>

                        {/* Manual Image URLs (for backward compatibility) */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1">
                            קישורי תמונות ידניים (מופרד בפסיקים) - אופציונלי
                          </label>
                          <textarea 
                            value={currentUnit.images?.filter(img => img && !img.startsWith('blob:')).join(', ') || ''} 
                            onChange={e => {
                              const manualUrls = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                              const existingImages = (currentUnit.images || []).filter(img => img && !img.startsWith('blob:'));
                              setCurrentUnit({...currentUnit, images: [...existingImages.filter(img => !manualUrls.includes(img)), ...manualUrls]});
                            }} 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-[11px] font-mono h-24 leading-relaxed outline-none" 
                            placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                          />
                        </div>
                      </div>
                   </div>
                   
                   <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 space-y-4 sm:space-y-6 shadow-sm lg:col-span-2">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3 flex items-center gap-2">
                         <Shield size={14} /> מתקנים ואבזור
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-3">
                        {accountFacilities.map(fac => {
                          const Icon = iconMap[fac.icon] || Puzzle;
                          const isSelected = currentUnit.facilityIds?.includes(fac.id);
                          return (
                            <button 
                              key={fac.id}
                              onClick={() => {
                                const currentIds = currentUnit.facilityIds || [];
                                setCurrentUnit({...currentUnit, facilityIds: isSelected ? currentIds.filter(id => id !== fac.id) : [...currentIds, fac.id]});
                              }}
                              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all text-center ${isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-xl' : 'border-slate-50 bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                            >
                              <Icon size={20} className={isSelected ? 'text-indigo-400' : 'text-slate-300'} />
                              <span className="text-[10px] font-bold">{fac.name}</span>
                            </button>
                          );
                        })}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-4">
                   <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="text-right w-full md:w-auto">
                         <h4 className="text-xl font-black text-slate-800 tracking-tight">ניהול תאריכים מיוחדים</h4>
                         <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">הגדרת מחירים לעונת שיא, חגים וסופי שבוע</p>
                      </div>
                      <button onClick={handleAddSpecialPrice} className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-600 transition-all">
                        <Plus size={18} /> הוספת תאריך מיוחד
                      </button>
                   </div>

                   <div className="bg-white rounded-xl sm:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                      <table className="w-full text-right border-collapse min-w-[600px] sm:min-w-[800px]">
                         <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                               <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">תיאור העונה</th>
                               <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">מתאריך</th>
                               <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">עד תאריך</th>
                               <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">מחיר ללילה</th>
                               <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">תנאים</th>
                               <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {currentUnit.specialPrices?.map((price) => (
                               <tr key={price.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                     <input type="text" value={price.label} onChange={e => setCurrentUnit({...currentUnit, specialPrices: currentUnit.specialPrices?.map(p => p.id === price.id ? {...p, label: e.target.value} : p)})} className="bg-transparent border-none text-sm font-black text-slate-800 w-full focus:ring-0 placeholder-slate-300" placeholder="למשל: יולי-אוגוסט" />
                                  </td>
                                  <td className="px-6 py-4">
                                     <input type="date" value={price.startDate} onChange={e => setCurrentUnit({...currentUnit, specialPrices: currentUnit.specialPrices?.map(p => p.id === price.id ? {...p, startDate: e.target.value} : p)})} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                                  </td>
                                  <td className="px-6 py-4">
                                     <input type="date" value={price.endDate} onChange={e => setCurrentUnit({...currentUnit, specialPrices: currentUnit.specialPrices?.map(p => p.id === price.id ? {...p, endDate: e.target.value} : p)})} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₪</span>
                                        <input type="number" value={price.pricePerNight} onChange={e => setCurrentUnit({...currentUnit, specialPrices: currentUnit.specialPrices?.map(p => p.id === price.id ? {...p, pricePerNight: Number(e.target.value)} : p)})} className="bg-slate-50 border border-slate-100 rounded-xl pl-4 pr-8 py-2.5 text-xs font-black w-28 focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex gap-2">
                                        <button 
                                          onClick={() => setCurrentUnit({...currentUnit, specialPrices: currentUnit.specialPrices?.map(p => p.id === price.id ? {...p, earlyCheckInAllowed: !p.earlyCheckInAllowed} : p)})} 
                                          className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center border ${price.earlyCheckInAllowed ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 'bg-slate-50 text-slate-300 border-slate-100'}`} 
                                          title="Early Check-In"
                                        >
                                           <Sun size={18} />
                                        </button>
                                        <button 
                                          onClick={() => setCurrentUnit({...currentUnit, specialPrices: currentUnit.specialPrices?.map(p => p.id === price.id ? {...p, lateCheckOutAllowed: !p.lateCheckOutAllowed} : p)})} 
                                          className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center border ${price.lateCheckOutAllowed ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' : 'bg-slate-50 text-slate-300 border-slate-100'}`} 
                                          title="Late Check-Out"
                                        >
                                           <Moon size={18} />
                                        </button>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-left">
                                     <button onClick={() => handleRemoveSpecialPrice(price.id)} className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                                  </td>
                               </tr>
                            ))}
                            {(!currentUnit.specialPrices || currentUnit.specialPrices.length === 0) && (
                               <tr>
                                  <td colSpan={6} className="py-20 text-center">
                                     <Calendar size={48} className="mx-auto text-slate-100 mb-4" />
                                     <p className="text-slate-300 font-bold">לא הוגדרו תאריכים מיוחדים ליחידה זו.</p>
                                  </td>
                               </tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}

              {activeTab === 'rooms' && (
                <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fadeIn pb-4">
                   {/* Unit Images Section */}
                   <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3 mb-6 flex items-center gap-2">
                         <ImagePlus size={14} /> תמונות הצימר
                      </h4>
                      
                      {/* File Upload */}
                      <div className="mb-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">
                          העלה תמונות או סרטונים מהמחשב
                        </label>
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                          <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload-rooms-tab"
                          />
                          <label htmlFor="file-upload-rooms-tab" className="cursor-pointer">
                            <ImagePlus size={32} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-sm font-bold text-slate-600 mb-1">לחץ להעלאת קבצים</p>
                            <p className="text-xs text-slate-400">PNG, JPG, MP4 ופורמטים נוספים</p>
                          </label>
                        </div>
                      </div>

                      {/* Uploaded Images Preview */}
                      {(() => {
                        const existingImages = (currentUnit.images || []).filter(img => img && !img.startsWith('blob:'));
                        const newImageFiles = uploadedFiles.filter(uf => uf.type === 'image');
                        const allImages = [...existingImages, ...newImageFiles.map(uf => uf.preview)];
                        
                        if (allImages.length === 0) {
                          return (
                            <div className="text-center py-8 text-slate-300">
                              <ImagePlus size={48} className="mx-auto mb-4 opacity-30" />
                              <p className="text-xs font-bold">אין תמונות שהועלו</p>
                              <p className="text-[10px] mt-1">העלה תמונות כדי להציג אותן כאן</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">
                              תמונות שהועלו
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {allImages.map((imageUrl, index) => {
                                const isMain = currentUnit.mainImage === imageUrl;
                                const isNewFile = imageUrl.startsWith('blob:');
                                // Fix URL for existing images (not blob URLs)
                                const fixedUrl = isNewFile ? imageUrl : fixImageUrl(imageUrl) || imageUrl;
                                console.log(`🖼️ [UnitsPage] Displaying unit image ${index + 1}:`, { 
                                  original: imageUrl, 
                                  fixed: fixedUrl, 
                                  isNewFile, 
                                  isMain 
                                });
                                return (
                                  <div key={`${imageUrl}-${index}`} className="relative group">
                                    <img 
                                      src={fixedUrl} 
                                      alt={`Image ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-xl border-2 transition-all"
                                      style={{ borderColor: isMain ? '#4f46e5' : '#e2e8f0' }}
                                      onError={(e) => {
                                        const imgElement = e.target as HTMLImageElement;
                                        console.error(`❌ [UnitsPage] Failed to load image:`, {
                                          original: imageUrl,
                                          fixed: fixedUrl,
                                          attempted: imgElement.src,
                                          currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A'
                                        });
                                        
                                        // Try to fix the URL one more time using backend URL
                                        if (!fixedUrl.startsWith('blob:') && !fixedUrl.startsWith('data:')) {
                                          // Get backend base URL (same logic as fixImageUrl)
                                          const apiUrl = getApiBaseUrl();
                                          let backendBaseUrl = '';
                                          if (apiUrl.includes('localhost:3000') || apiUrl.includes('127.0.0.1:3000')) {
                                            backendBaseUrl = apiUrl.replace('/api', '');
                                          } else {
                                            backendBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                                          }
                                          
                                          let retryUrl = fixedUrl;
                                          
                                          // If URL is relative (starts with /uploads), use backend URL
                                          if (retryUrl.startsWith('/uploads/') || retryUrl.startsWith('/')) {
                                            if (backendBaseUrl) {
                                              retryUrl = `${backendBaseUrl}${retryUrl.startsWith('/') ? retryUrl : `/${retryUrl}`}`;
                                              console.log(`🔄 [UnitsPage] Retrying relative URL with backend: ${retryUrl}`);
                                            }
                                          }
                                          // If URL contains localhost:5173 (frontend), replace with backend
                                          else if (retryUrl.includes('localhost:5173') || retryUrl.includes('localhost:5174')) {
                                            if (backendBaseUrl) {
                                              try {
                                                const urlObj = new URL(retryUrl);
                                                retryUrl = `${backendBaseUrl}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
                                                console.log(`🔄 [UnitsPage] Replacing frontend URL with backend: ${retryUrl}`);
                                              } catch (e) {
                                                const pathMatch = retryUrl.match(/\/(uploads\/[^?\s]*)/);
                                                if (pathMatch) {
                                                  retryUrl = `${backendBaseUrl}${pathMatch[1]}`;
                                                }
                                              }
                                            }
                                          }
                                          
                                          // Only retry once to avoid infinite loop
                                          if (retryUrl !== imgElement.src && retryUrl !== fixedUrl && retryUrl.startsWith('http')) {
                                            console.log(`🔄 [UnitsPage] Retrying with URL: ${retryUrl}`);
                                            imgElement.src = retryUrl;
                                            return;
                                          }
                                        }
                                        
                                        // Show a simple gray placeholder without text
                                        imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UyZThmMCIvPjxwYXRoIGQ9Ik0gODAgNjAgTCAxMjAgMTAwIEwgODAgMTQwIEwgNDAgMTAwIFoiIGZpbGw9IiM5NDk5YTUiIG9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==';
                                      }}
                                      onLoad={() => {
                                        console.log(`✅ [UnitsPage] Image loaded successfully: ${fixedUrl}`);
                                      }}
                                    />
                                    {isNewFile && (
                                      <div className="absolute top-1 right-1 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                        חדש
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all flex items-center justify-center gap-1">
                                      {!isMain && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleSetMainImage(imageUrl);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold transition-opacity hover:bg-indigo-700"
                                        >
                                          תמונה ראשית
                                        </button>
                                      )}
                                      {isMain && (
                                        <span className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold transition-opacity">
                                          ✓ ראשית
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (isNewFile) {
                                          // Remove from uploadedFiles
                                          const fileIndex = uploadedFiles.findIndex(uf => uf.preview === imageUrl);
                                          if (fileIndex !== -1) {
                                            handleRemoveFile(fileIndex);
                                          }
                                        } else {
                                          // Remove from existing images
                                          const newImages = existingImages.filter((_, i) => i !== index - newImageFiles.length);
                                          setCurrentUnit({ 
                                            ...currentUnit, 
                                            images: newImages,
                                            mainImage: isMain ? (newImages[0] || '') : currentUnit.mainImage
                                          });
                                        }
                                      }}
                                      className="absolute top-1 left-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                   </div>

                   {/* Rooms Section */}
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                   {/* Rooms List */}
                   <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm lg:col-span-1 h-fit">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-6">
                        <button onClick={() => {
                          const newRoom = { id: Math.random().toString(), name: 'חדר חדש', beds_count: 1, windows_count: 1, room_type: 'bedroom', facilityIds: [] };
                          setTempRooms([...tempRooms, newRoom]);
                          setSelectedRoomId(newRoom.id);
                        }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Plus size={18}/></button>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.rooms}</h4>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                         {tempRooms.length === 0 && (
                           <div className="text-center py-8 text-slate-300">
                             <Bed size={32} className="mx-auto mb-2 opacity-30" />
                             <p className="text-xs font-bold">אין חדרים</p>
                           </div>
                         )}
                         {tempRooms.map(room => (
                           <button 
                             key={room.id} 
                             onClick={() => setSelectedRoomId(room.id)}
                             className={`w-full text-right p-4 rounded-2xl border transition-all ${selectedRoomId === room.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-100 text-slate-800 hover:border-slate-300'}`}
                           >
                              <div className="flex gap-3 items-start">
                                 <div className={`p-2 rounded-lg flex-shrink-0 ${selectedRoomId === room.id ? 'bg-white/20 text-white' : 'bg-white text-slate-400'}`}><Bed size={16}/></div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black truncate">{room.name || 'חדר חדש'}</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${selectedRoomId === room.id ? 'text-white/70' : 'text-slate-400'}`}>{room.beds_count || 0} מיטות</p>
                                 </div>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     e.preventDefault();
                                     if (confirm('האם אתה בטוח שברצונך למחוק את החדר הזה?')) {
                                       const newRooms = tempRooms.filter(r => r.id !== room.id);
                                       setTempRooms(newRooms);
                                       if (selectedRoomId === room.id) {
                                         setSelectedRoomId(newRooms.length > 0 ? newRooms[0].id : null);
                                       }
                                     }
                                   }}
                                   className={`p-1.5 flex-shrink-0 opacity-70 hover:opacity-100 transition-all rounded-lg ${selectedRoomId === room.id ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-50 text-rose-500'}`}
                                   title="מחק חדר"
                                 ><Trash2 size={14}/></button>
                              </div>
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* Room Details Editor */}
                   <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm lg:col-span-2">
                      {tempRooms.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                          <Bed size={48} className="mx-auto mb-4 opacity-30" />
                          <p className="font-bold">בחר חדר לעריכה</p>
                          <p className="text-xs">או הוסף חדר חדש</p>
                        </div>
                      ) : (
                        (() => {
                          const selectedRoom = selectedRoomId ? tempRooms.find(r => r.id === selectedRoomId) : tempRooms[0];
                          if (!selectedRoom) return null;
                          
                          return (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h5 className="text-sm font-black text-slate-800">עריכת חדר: {selectedRoom.name}</h5>
                                <button
                                  onClick={() => {
                                    if (confirm('האם אתה בטוח שברצונך למחוק את החדר הזה?')) {
                                      const newRooms = tempRooms.filter(r => r.id !== selectedRoom.id);
                                      setTempRooms(newRooms);
                                      if (newRooms.length > 0) {
                                        setSelectedRoomId(newRooms[0].id);
                                      } else {
                                        setSelectedRoomId(null);
                                      }
                                    }
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all text-xs font-bold"
                                >
                                  <Trash2 size={14} />
                                  מחק חדר
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">שם החדר</label>
                                  <input type="text" value={selectedRoom?.name} onChange={e => setTempRooms(tempRooms.map(r => r.id === selectedRoom?.id ? {...r, name: e.target.value} : r))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">סוג חדר</label>
                                  <select value={selectedRoom?.room_type || 'bedroom'} onChange={e => setTempRooms(tempRooms.map(r => r.id === selectedRoom?.id ? {...r, room_type: e.target.value} : r))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none">
                                    <option value="bedroom">חדר שינה</option>
                                    <option value="living">סלון</option>
                                    <option value="kitchen">מטבח</option>
                                    <option value="bathroom">חדר רחצה</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">מספר מיטות</label>
                                  <input type="number" value={selectedRoom?.beds_count || 0} onChange={e => setTempRooms(tempRooms.map(r => r.id === selectedRoom?.id ? {...r, beds_count: Number(e.target.value)} : r))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
                                </div>
                                
                                <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">מספר חלונות</label>
                                  <input type="number" value={selectedRoom?.windows_count || 0} onChange={e => setTempRooms(tempRooms.map(r => r.id === selectedRoom?.id ? {...r, windows_count: Number(e.target.value)} : r))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
                                </div>
                              </div>
                              
                              {/* Facilities Selection for Room */}
                              <div className="border-t border-slate-100 pt-6">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">מתקנים בחדר זה</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {accountFacilities.map(fac => {
                                    const Icon = iconMap[fac.icon] || Puzzle;
                                    const isSelected = selectedRoom?.facilityIds?.includes(fac.id);
                                    return (
                                      <button 
                                        key={fac.id}
                                        onClick={() => {
                                          const currentFacilityIds = selectedRoom?.facilityIds || [];
                                          const newFacilityIds = isSelected 
                                            ? currentFacilityIds.filter(id => id !== fac.id)
                                            : [...currentFacilityIds, fac.id];
                                          setTempRooms(tempRooms.map(r => 
                                            r.id === selectedRoom?.id 
                                              ? {...r, facilityIds: newFacilityIds}
                                              : r
                                          ));
                                        }}
                                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all text-center ${
                                          isSelected 
                                            ? 'border-slate-900 bg-slate-900 text-white shadow-xl' 
                                            : 'border-slate-50 bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                      >
                                        <Icon size={18} className={isSelected ? 'text-indigo-400' : 'text-slate-300'} />
                                        <span className="text-[10px] font-bold">{fac.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {accountFacilities.length === 0 && (
                                  <p className="text-xs text-slate-400 text-center py-4">אין מתקנים זמינים. הוסף מתקנים בלשונית "מתקנים"</p>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      )}
                   </div>
                   </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer - Fixed */}
            <div className="flex-shrink-0 px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button 
                onClick={() => setShowModal(false)} 
                className="order-2 sm:order-1 px-6 sm:px-12 py-3 sm:py-4 bg-slate-50 text-slate-500 font-bold rounded-xl sm:rounded-[1.5rem] transition-all hover:bg-slate-100 text-sm sm:text-base"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleSaveUnit}
                disabled={loading}
                className="order-1 sm:order-2 flex-1 bg-slate-900 text-white font-black py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] transition-all shadow-xl shadow-slate-200 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    שומר...
                  </>
                ) : (
                  modalMode === 'add' ? 'צור יחידה חדשה' : 'שמור שינויים'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitsPage;
