
import React, { useState, useEffect } from 'react';
import { AppState, BookingStatus, UserRole, Booking, ZimmerUnit } from '../types';
import { translations, Language } from '../translations';
import { bookingsAPI, unitsAPI } from '../api';
import { MoreHorizontal, Calendar as CalendarIcon, CheckCircle, Globe, RefreshCw, CheckCircle2, Plus, X, Edit2, Trash2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
  isReadOnly?: boolean;
}

// ─── Toast notification component ────────────────────────────────────────────
type ToastType = 'error' | 'warning' | 'success' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

let toastCounter = 0;

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const icons: Record<ToastType, React.ReactNode> = {
    error:   <AlertCircle   size={20} className="shrink-0" />,
    warning: <AlertTriangle size={20} className="shrink-0" />,
    success: <CheckCircle2  size={20} className="shrink-0" />,
    info:    <Info          size={20} className="shrink-0" />,
  };

  const styles: Record<ToastType, string> = {
    error:   'bg-rose-50   border-rose-200   text-rose-800',
    warning: 'bg-amber-50  border-amber-200  text-amber-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info:    'bg-blue-50   border-blue-200   text-blue-800',
  };

  const iconStyles: Record<ToastType, string> = {
    error:   'text-rose-500',
    warning: 'text-amber-500',
    success: 'text-emerald-500',
    info:    'text-blue-500',
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-sm px-4 sm:px-0 sm:max-w-md pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl shadow-slate-200/60 pointer-events-auto animate-fadeIn ${styles[toast.type]}`}
          dir="rtl"
        >
          <span className={iconStyles[toast.type]}>{icons[toast.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-snug">{toast.title}</p>
            {toast.message && (
              <p className="text-xs font-medium mt-0.5 opacity-80">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="סגור"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── Inline field error ───────────────────────────────────────────────────────
const FieldError: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-rose-500 font-bold mt-1 mr-1">
      <AlertCircle size={12} />
      {message}
    </p>
  );
};

const BookingsPage: React.FC<Props> = ({ db, setDb, lang, isReadOnly = false }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isClient = isReadOnly || user?.role === UserRole.CLIENT || user?.role === UserRole.CUSTOMER;
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [units, setUnits] = useState<ZimmerUnit[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [currentBooking, setCurrentBooking] = useState<Partial<Booking>>({
    unitId: '',
    guestName: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    totalPrice: 0,
    status: BookingStatus.PENDING
  });

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = (type: ToastType, title: string, message?: string, duration = 5000) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, type, title, message }]);
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
    return id;
  };

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Translate API error messages to Hebrew
  const translateError = (msg: string): { title: string; detail?: string } => {
    if (msg.includes('already booked for the selected dates') || msg.includes('Unit is already booked')) {
      return {
        title: 'היחידה תפוסה בתאריכים אלו',
        detail: 'בחר תאריכים אחרים או יחידה פנויה אחרת.'
      };
    }
    if (msg.includes('checkOut must be after checkIn')) {
      return {
        title: 'תאריך יציאה חייב להיות אחרי תאריך כניסה',
      };
    }
    if (msg.includes('unitId, checkIn and checkOut are required')) {
      return {
        title: 'יש למלא יחידה ותאריכים',
      };
    }
    if (msg.includes('Booking not found')) {
      return { title: 'ההזמנה לא נמצאה' };
    }
    if (msg.includes('Access denied')) {
      return { title: 'אין הרשאה לבצע פעולה זו' };
    }
    if (msg.includes('Network') || msg.includes('fetch')) {
      return { title: 'שגיאת תקשורת', detail: 'בדוק את החיבור לאינטרנט ונסה שוב.' };
    }
    return { title: 'שגיאה', detail: msg };
  };

  
  // Load bookings and units from API on mount
  useEffect(() => {
    loadBookings();
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const data = await unitsAPI.getAll();
      setUnits(data || []);
    } catch (err: any) {
      console.error('❌ [BookingsPage] Error loading units:', err);
      const { title, detail } = translateError(err.message || '');
      addToast('error', 'שגיאה בטעינת יחידות', detail || title);
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingsAPI.getAll();
      setBookings(data || []);
      setDb({ ...db, bookings: data || [] });
    } catch (err: any) {
      console.error('❌ [BookingsPage] Error loading bookings:', err);
      const { title, detail } = translateError(err.message || '');
      addToast('error', 'שגיאה בטעינת ההזמנות', detail || title);
    } finally {
      setLoading(false);
    }
  };
  
  // Use bookings from state (loaded from API) instead of db.bookings
  // Backend already filters by accountId for non-admin users
  const displayedBookings = bookings;

  const handleSyncAll = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const updatedBookings = db.bookings.map(b => ({ ...b, googleSynced: true }));
      setDb({ ...db, bookings: updatedBookings });
      setIsSyncing(false);
    }, 1500);
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED: 
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">{status}</span>;
      case BookingStatus.PENDING: 
        return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-100">Pending</span>;
      default: 
        return <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-100">{status}</span>;
    }
  };

  const getUnitName = (id: string) => {
    const unit = units.find(u => u.id === id) || db.units.find(u => u.id === id);
    return unit?.name || 'Unknown';
  };

  const handleOpenAdd = () => {
    // Prevent clients from creating bookings
    if (isClient) {
      return;
    }
    setCurrentBooking({
      unitId: '',
      guestName: '',
      guestPhone: '',
      checkIn: '',
      checkOut: '',
      totalPrice: 0,
      status: BookingStatus.PENDING
    });
    setModalMode('add');
    setShowModal(true);
  };

  const handleOpenEdit = (booking: Booking) => {
    // Prevent clients from editing bookings
    if (isClient) {
      return;
    }
    setCurrentBooking({
      id: booking.id,
      unitId: booking.unitId,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: booking.totalPrice,
      status: booking.status
    });
    setModalMode('edit');
    setShowModal(true);
  };

  // Handle unit change - recalculate price
  const handleUnitChange = (unitId: string) => {
    setCurrentBooking(prev => {
      const newBooking = { ...prev, unitId };
      if (newBooking.checkIn && newBooking.checkOut) {
        const total = calculateTotalPrice(unitId, newBooking.checkIn, newBooking.checkOut);
        return { ...newBooking, totalPrice: total };
      }
      return newBooking;
    });
  };

  // Handle date change - recalculate price
  const handleDateChange = (field: 'checkIn' | 'checkOut', value: string) => {
    setCurrentBooking(prev => {
      const newBooking = { ...prev, [field]: value };
      if (newBooking.unitId && newBooking.checkIn && newBooking.checkOut) {
        const total = calculateTotalPrice(newBooking.unitId, newBooking.checkIn, newBooking.checkOut);
        return { ...newBooking, totalPrice: total };
      }
      return newBooking;
    });
  };

  const handleSaveBooking = async () => {
    // Client-side validation with inline field errors
    const errors: Record<string, string> = {};
    if (!currentBooking.unitId)    errors.unitId    = 'יש לבחור יחידה';
    if (!currentBooking.guestName) errors.guestName = 'יש להזין שם אורח';
    if (!currentBooking.guestPhone) errors.guestPhone = 'יש להזין טלפון אורח';
    if (!currentBooking.checkIn)   errors.checkIn   = 'יש לבחור תאריך כניסה';
    if (!currentBooking.checkOut)  errors.checkOut  = 'יש לבחור תאריך יציאה';
    if (currentBooking.checkIn && currentBooking.checkOut && currentBooking.checkIn >= currentBooking.checkOut) {
      errors.checkOut = 'תאריך יציאה חייב להיות אחרי תאריך כניסה';
    }
    if (!currentBooking.totalPrice) errors.totalPrice = 'המחיר חייב להיות גדול מ-0';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);
      if (modalMode === 'edit' && currentBooking.id) {
        await bookingsAPI.update(currentBooking.id, currentBooking);
        addToast('success', 'ההזמנה עודכנה בהצלחה');
      } else {
        await bookingsAPI.create(currentBooking);
        addToast('success', 'ההזמנה נוצרה בהצלחה');
      }
      await loadBookings();
      setShowModal(false);
    } catch (err: any) {
      console.error(`❌ [BookingsPage] Error ${modalMode === 'edit' ? 'updating' : 'creating'} booking:`, err);
      const { title, detail } = translateError(err.message || '');

      // For date-conflict errors, also mark the date fields inline
      if (err.message?.includes('already booked') || err.message?.includes('already booked for the selected dates')) {
        setFieldErrors({
          checkIn:  'תאריכים תפוסים',
          checkOut: 'תאריכים תפוסים',
        });
      }

      addToast('error', title, detail);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) {
      return;
    }

    try {
      setLoading(true);
      await bookingsAPI.delete(bookingId);
      addToast('success', 'ההזמנה נמחקה בהצלחה');
      await loadBookings();
    } catch (err: any) {
      console.error('❌ [BookingsPage] Error deleting booking:', err);
      const { title, detail } = translateError(err.message || '');
      addToast('error', title, detail);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = (unitId?: string, checkInDate?: string, checkOutDate?: string) => {
    const unitIdToUse = unitId || currentBooking.unitId;
    const checkInToUse = checkInDate || currentBooking.checkIn;
    const checkOutToUse = checkOutDate || currentBooking.checkOut;
    
    if (!unitIdToUse || !checkInToUse || !checkOutToUse) return 0;
    const unit = units.find(u => u.id === unitIdToUse);
    if (!unit) return 0;
    
    const checkIn = new Date(checkInToUse);
    const checkOut = new Date(checkOutToUse);
    
    // Calculate number of nights
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;
    
    let totalPrice = 0;
    const basePrice = unit.pricePerNight || 0;
    
    // Check each night and apply special prices if applicable
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkIn);
      currentDate.setDate(checkIn.getDate() + i);
      // Normalize to YYYY-MM-DD format (avoid timezone issues)
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      let priceForNight = basePrice;
      if (unit.specialPrices && unit.specialPrices.length > 0) {
        for (const specialPrice of unit.specialPrices) {
          if (specialPrice.startDate && specialPrice.endDate) {
            if (dateStr >= specialPrice.startDate && dateStr <= specialPrice.endDate) {
              priceForNight = specialPrice.pricePerNight || basePrice;
              break; // Use first matching special price
            }
          }
        }
      }
      
      totalPrice += priceForNight;
    }
    
    return totalPrice;
  };

  // Auto-calculate price when unit, checkIn, or checkOut changes
  useEffect(() => {
    if (currentBooking.unitId && currentBooking.checkIn && currentBooking.checkOut) {
      const total = calculateTotalPrice();
      setCurrentBooking(prev => ({ ...prev, totalPrice: total }));
    } else {
      // Reset price if required fields are missing
      setCurrentBooking(prev => ({ ...prev, totalPrice: 0 }));
    }
  }, [currentBooking.unitId, currentBooking.checkIn, currentBooking.checkOut, units]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.bookings}</h2>
          <p className="text-slate-500 font-medium">
            {isClient ? 'הזמנות שלך' : 'מעקב אחר הזמנות, סטטוס אורחים וסנכרון יומנים.'}
          </p>
        </div>
        {!isClient && (
          <div className="flex gap-3">
            <button 
              onClick={handleOpenAdd}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl shadow-slate-200"
            >
              <Plus size={18} />
              צור הזמנה
            </button>
            <button 
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Globe size={18} />}
              סנכרן הכל ליומן גוגל
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse" dir={t.dir}>
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">אורח</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">צימר / יחידה</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">תאריכים</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">סטטוס סנכרון</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">סה"כ</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">סטטוס</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-sm">
                        {booking.guestName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{booking.guestName}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{booking.guestPhone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-600">{getUnitName(booking.unitId)}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700">{booking.checkIn}</span>
                      <span className="text-[10px] text-slate-400 font-bold">עד {booking.checkOut}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {booking.googleSynced ? (
                      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 w-fit px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm animate-fadeIn">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-tight">Synced to Google</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 bg-slate-50 w-fit px-3 py-1.5 rounded-xl border border-slate-100">
                        <RefreshCw size={14} />
                        <span className="text-[10px] font-black uppercase tracking-tight">Pending Sync</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-slate-800">₪{booking.totalPrice.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-5">{getStatusBadge(booking.status)}</td>
                  <td className="px-6 py-5">
                    {!isClient && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleOpenEdit(booking)}
                          className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 rounded-xl shadow-sm transition-colors"
                          title="ערוך הזמנה"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-100 rounded-xl shadow-sm transition-colors"
                          title="מחק הזמנה"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayedBookings.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <CalendarIcon size={48} className="mx-auto text-slate-200" />
              <p className="text-slate-400 font-black">אין הזמנות פעילות להצגה.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-slate-800">
                  {modalMode === 'edit' ? 'ערוך הזמנה' : 'צור הזמנה חדשה'}
                </h3>
                <button onClick={() => { setShowModal(false); setFieldErrors({}); }} className="p-2 text-slate-400 hover:text-slate-900">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">יחידה</label>
                  <select
                    value={currentBooking.unitId}
                    onChange={e => { handleUnitChange(e.target.value); setFieldErrors(p => ({ ...p, unitId: '' })); }}
                    className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.unitId ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
                  >
                    <option value="">בחר יחידה</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name} - ₪{unit.pricePerNight}/לילה</option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors.unitId} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">שם אורח</label>
                    <input
                      type="text"
                      value={currentBooking.guestName}
                      onChange={e => { setCurrentBooking({ ...currentBooking, guestName: e.target.value }); setFieldErrors(p => ({ ...p, guestName: '' })); }}
                      className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.guestName ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
                      placeholder="ישראל ישראלי"
                    />
                    <FieldError message={fieldErrors.guestName} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">טלפון אורח</label>
                    <input
                      type="tel"
                      value={currentBooking.guestPhone}
                      onChange={e => { setCurrentBooking({ ...currentBooking, guestPhone: e.target.value }); setFieldErrors(p => ({ ...p, guestPhone: '' })); }}
                      className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.guestPhone ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
                      placeholder="050-1234567"
                    />
                    <FieldError message={fieldErrors.guestPhone} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תאריך כניסה</label>
                    <input
                      type="date"
                      value={currentBooking.checkIn}
                      onChange={e => { handleDateChange('checkIn', e.target.value); setFieldErrors(p => ({ ...p, checkIn: '', checkOut: '' })); }}
                      className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.checkIn ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
                    />
                    <FieldError message={fieldErrors.checkIn} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תאריך יציאה</label>
                    <input
                      type="date"
                      value={currentBooking.checkOut}
                      onChange={e => { handleDateChange('checkOut', e.target.value); setFieldErrors(p => ({ ...p, checkIn: '', checkOut: '' })); }}
                      className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.checkOut ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
                    />
                    <FieldError message={fieldErrors.checkOut} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סה"כ מחיר</label>
                  <input
                    type="number"
                    value={currentBooking.totalPrice}
                    onChange={e => setCurrentBooking({ ...currentBooking, totalPrice: Number(e.target.value) })}
                    className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.totalPrice ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
                    placeholder="0"
                    min="0"
                    readOnly
                  />
                  <FieldError message={fieldErrors.totalPrice} />
                  {currentBooking.unitId && currentBooking.checkIn && currentBooking.checkOut && (() => {
                    const unit = units.find(u => u.id === currentBooking.unitId);
                    return (
                      <p className="text-xs text-slate-400 mt-1 mr-2">
                        מחיר מחושב אוטומטית לפי הלילות {unit?.specialPrices && unit.specialPrices.length > 0 && '(כולל מחירים מיוחדים)'}
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סטטוס</label>
                  <select
                    value={currentBooking.status}
                    onChange={e => setCurrentBooking({ ...currentBooking, status: e.target.value as BookingStatus })}
                    className="w-full bg-slate-50 border-transparent border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                  >
                    <option value={BookingStatus.PENDING}>Pending</option>
                    <option value={BookingStatus.CONFIRMED}>Confirmed</option>
                    <option value={BookingStatus.CANCELLED}>Cancelled</option>
                    <option value={BookingStatus.COMPLETED}>Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleSaveBooking}
                  disabled={loading}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                >
                  {loading ? 'שומר...' : modalMode === 'edit' ? 'עדכן הזמנה' : 'שמור הזמנה'}
                </button>
                <button
                  onClick={() => { setShowModal(false); setFieldErrors({}); }}
                  className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
