import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Booking, BookingStatus, User, ZimmerUnit } from '../../types';
import { calculateTotalPrice } from '../../utils/bookingPrice';
import {
  bookingsOverlap,
  isCheckInDateDisabled,
  isCheckOutDateDisabled,
} from '../../utils/bookingOccupancy';
import BookingDatePicker from './BookingDatePicker';

export const FieldError: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-rose-500 font-bold mt-1 mr-1">
      <AlertCircle size={12} />
      {message}
    </p>
  );
};

export const translateBookingError = (msg: string): { title: string; detail?: string } => {
  if (msg.includes('already booked for the selected dates') || msg.includes('Unit is already booked')) {
    return { title: 'היחידה תפוסה בתאריכים אלו', detail: 'בחר תאריכים אחרים או יחידה פנויה אחרת.' };
  }
  if (msg.includes('checkOut must be after checkIn')) {
    return { title: 'תאריך יציאה חייב להיות אחרי תאריך כניסה' };
  }
  if (msg.includes('unitId, checkIn and checkOut are required')) {
    return { title: 'יש למלא יחידה ותאריכים' };
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

interface Props {
  isOpen: boolean;
  mode: 'add' | 'edit';
  currentBooking: Partial<Booking>;
  onChange: (booking: Partial<Booking>) => void;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
  units: ZimmerUnit[];
  fieldErrors: Record<string, string>;
  showAdminUserSelect?: boolean;
  users?: User[];
  selectedUserId?: string;
  onSelectedUserIdChange?: (id: string) => void;
  availableUnits?: ZimmerUnit[];
  existingBookings?: Booking[];
  onClearFieldErrors?: (keys: string[]) => void;
}

const BookingFormModal: React.FC<Props> = ({
  isOpen,
  mode,
  currentBooking,
  onChange,
  onClose,
  onSave,
  loading,
  units,
  fieldErrors,
  showAdminUserSelect = false,
  users = [],
  selectedUserId = '',
  onSelectedUserIdChange,
  availableUnits,
  existingBookings = [],
  onClearFieldErrors,
}) => {
  const unitsToShow = availableUnits ?? units;
  const excludeBookingId = mode === 'edit' ? currentBooking.id : undefined;

  useEffect(() => {
    if (currentBooking.unitId && currentBooking.checkIn && currentBooking.checkOut) {
      const unit = units.find(u => u.id === currentBooking.unitId);
      const total = calculateTotalPrice(unit, currentBooking.checkIn, currentBooking.checkOut);
      if (total !== currentBooking.totalPrice) {
        onChange({ ...currentBooking, totalPrice: total });
      }
    }
  }, [currentBooking.unitId, currentBooking.checkIn, currentBooking.checkOut, units]);

  if (!isOpen) return null;

  const isUnitOccupied = (unitId: string) => {
    if (!currentBooking.checkIn || !currentBooking.checkOut) return false;
    return bookingsOverlap(
      unitId,
      currentBooking.checkIn,
      currentBooking.checkOut,
      existingBookings,
      excludeBookingId
    );
  };

  const handleUnitChange = (unitId: string) => {
    const updated: Partial<Booking> = { ...currentBooking, unitId };
    if (unitId && updated.checkIn && isCheckInDateDisabled(unitId, updated.checkIn, existingBookings, excludeBookingId)) {
      updated.checkIn = '';
      updated.checkOut = '';
    } else if (unitId && updated.checkIn && updated.checkOut &&
      isCheckOutDateDisabled(unitId, updated.checkIn, updated.checkOut, existingBookings, excludeBookingId)) {
      updated.checkOut = '';
    }
    onChange(updated);
    onClearFieldErrors?.(['unitId', 'checkIn', 'checkOut']);
  };

  const handleCheckInChange = (checkIn: string) => {
    let checkOut = currentBooking.checkOut || '';
    if (currentBooking.unitId && checkOut &&
      isCheckOutDateDisabled(currentBooking.unitId, checkIn, checkOut, existingBookings, excludeBookingId)) {
      checkOut = '';
    }
    onChange({ ...currentBooking, checkIn, checkOut });
    onClearFieldErrors?.(['checkIn', 'checkOut']);
  };

  const handleCheckOutChange = (checkOut: string) => {
    onChange({ ...currentBooking, checkOut });
    onClearFieldErrors?.(['checkOut']);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-slate-800">
              {mode === 'edit' ? 'ערוך הזמנה' : 'צור הזמנה חדשה'}
            </h3>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {showAdminUserSelect && onSelectedUserIdChange && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">בחר משתמש</label>
                <select
                  value={selectedUserId}
                  onChange={e => onSelectedUserIdChange(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                >
                  <option value="">בחר משתמש</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email}) - {u.role}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">יחידה</label>
              <select
                value={currentBooking.unitId}
                onChange={e => handleUnitChange(e.target.value)}
                disabled={showAdminUserSelect && !selectedUserId}
                className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.unitId ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
              >
                <option value="">בחר יחידה</option>
                {unitsToShow.map(unit => {
                  const occupied = isUnitOccupied(unit.id);
                  return (
                    <option key={unit.id} value={unit.id} disabled={occupied}>
                      {unit.name} - ₪{unit.pricePerNight}/לילה{occupied ? ' (תפוס)' : ''}
                    </option>
                  );
                })}
              </select>
              <FieldError message={fieldErrors.unitId} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">שם אורח</label>
                <input
                  type="text"
                  value={currentBooking.guestName || ''}
                  onChange={e => onChange({ ...currentBooking, guestName: e.target.value })}
                  className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.guestName ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
                  placeholder="ישראל ישראלי"
                />
                <FieldError message={fieldErrors.guestName} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">טלפון אורח</label>
                <input
                  type="tel"
                  value={currentBooking.guestPhone || ''}
                  onChange={e => onChange({ ...currentBooking, guestPhone: e.target.value })}
                  className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.guestPhone ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
                  placeholder="050-1234567"
                />
                <FieldError message={fieldErrors.guestPhone} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תאריך כניסה</label>
                <BookingDatePicker
                  value={currentBooking.checkIn || ''}
                  onChange={handleCheckInChange}
                  mode="checkIn"
                  unitId={currentBooking.unitId}
                  existingBookings={existingBookings}
                  excludeBookingId={excludeBookingId}
                  error={fieldErrors.checkIn}
                />
                <FieldError message={fieldErrors.checkIn} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תאריך יציאה</label>
                <BookingDatePicker
                  value={currentBooking.checkOut || ''}
                  onChange={handleCheckOutChange}
                  mode="checkOut"
                  unitId={currentBooking.unitId}
                  checkIn={currentBooking.checkIn}
                  existingBookings={existingBookings}
                  excludeBookingId={excludeBookingId}
                  error={fieldErrors.checkOut}
                />
                <FieldError message={fieldErrors.checkOut} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סה&quot;כ מחיר</label>
              <input
                type="number"
                value={currentBooking.totalPrice ?? 0}
                readOnly
                className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all ${fieldErrors.totalPrice ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'}`}
              />
              <FieldError message={fieldErrors.totalPrice} />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סטטוס</label>
              <select
                value={currentBooking.status}
                onChange={e => onChange({ ...currentBooking, status: e.target.value as BookingStatus })}
                className="w-full bg-slate-50 border-transparent border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
              >
                <option value={BookingStatus.PENDING}>בהמתנה</option>
                <option value={BookingStatus.CONFIRMED}>מאושר</option>
                <option value={BookingStatus.CANCELLED}>בוטל</option>
                <option value={BookingStatus.COMPLETED}>הושלם</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onSave}
              disabled={loading || (showAdminUserSelect && !selectedUserId)}
              className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {loading ? 'שומר...' : mode === 'edit' ? 'עדכן הזמנה' : 'שמור הזמנה'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingFormModal;
