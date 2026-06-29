import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Edit2,
  MapPin,
  Phone,
  Save,
  X,
} from 'lucide-react';
import { Booking, BookingStatus, ZimmerUnit } from '../../types';
import { formatHebrewDate, getHoliday } from '../../utils/calendarUtils';
import { bookingsAPI } from '../../api';

interface Props {
  booking: Booking;
  units: ZimmerUnit[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onError: (message: string) => void;
}

const BookingDetailsModal: React.FC<Props> = ({
  booking: initialBooking,
  units,
  isOpen,
  onClose,
  onUpdated,
  onError,
}) => {
  const [booking, setBooking] = useState(initialBooking);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBooking(initialBooking);
    setIsEditing(false);
  }, [initialBooking]);

  if (!isOpen) return null;

  const unit = units.find(u => u.id === booking.unitId);
  const nights = Math.ceil(
    (new Date(booking.checkOut + 'T00:00:00').getTime() - new Date(booking.checkIn + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const handleSave = async () => {
    try {
      setLoading(true);
      await bookingsAPI.update(booking.id, booking);
      setIsEditing(false);
      onUpdated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה בעדכון';
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800">פרטי הזמנה</h3>
              <p className="text-sm text-slate-500 mt-1">ID: {booking.id}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100"
                >
                  <Edit2 size={20} />
                </button>
              )}
              <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={24} />
              </button>
            </div>
          </div>

          {!isEditing ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black">
                    {booking.guestName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800">{booking.guestName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-600 font-bold">{booking.guestPhone}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                  <CalendarIcon size={20} className="text-blue-600 mb-2" />
                  <p className="text-[10px] font-black text-blue-600 uppercase">תאריך כניסה</p>
                  <p className="text-lg font-black text-slate-800 mt-1">{booking.checkIn}</p>
                  <p className="text-sm text-blue-600 font-bold">{formatHebrewDate(booking.checkIn)}</p>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                  <Clock size={20} className="text-indigo-600 mb-2" />
                  <p className="text-[10px] font-black text-indigo-600 uppercase">תאריך יציאה</p>
                  <p className="text-lg font-black text-slate-800 mt-1">{booking.checkOut}</p>
                  <p className="text-sm text-indigo-600 font-bold">{formatHebrewDate(booking.checkOut)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                  <MapPin size={20} className="text-emerald-600 mb-2" />
                  <p className="text-[10px] font-black text-emerald-600 uppercase">יחידה</p>
                  <p className="text-lg font-black text-slate-800 mt-1">{unit?.name || 'לא נמצא'}</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                  <DollarSign size={20} className="text-amber-600 mb-2" />
                  <p className="text-[10px] font-black text-amber-600 uppercase">סה&quot;כ</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">₪{booking.totalPrice.toLocaleString()}</p>
                  <p className="text-xs text-amber-600 font-bold">{nights} לילות</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {booking.status === BookingStatus.CONFIRMED && (
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-black">מאושר</span>
                )}
                {booking.status === BookingStatus.PENDING && (
                  <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-black">בהמתנה</span>
                )}
                {booking.status === BookingStatus.CANCELLED && (
                  <span className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-black">בוטל</span>
                )}
                {booking.status === BookingStatus.COMPLETED && (
                  <span className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-black">הושלם</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">שם אורח</label>
                  <input
                    type="text"
                    value={booking.guestName}
                    onChange={e => setBooking({ ...booking, guestName: e.target.value })}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">טלפון</label>
                  <input
                    type="tel"
                    value={booking.guestPhone}
                    onChange={e => setBooking({ ...booking, guestPhone: e.target.value })}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">כניסה</label>
                  <input
                    type="date"
                    value={booking.checkIn}
                    onChange={e => setBooking({ ...booking, checkIn: e.target.value })}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm"
                  />
                  {getHoliday(booking.checkIn) && (
                    <p className="text-xs text-rose-600 font-black mt-1">{getHoliday(booking.checkIn)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">יציאה</label>
                  <input
                    type="date"
                    value={booking.checkOut}
                    onChange={e => setBooking({ ...booking, checkOut: e.target.value })}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">מחיר</label>
                <input
                  type="number"
                  value={booking.totalPrice}
                  onChange={e => setBooking({ ...booking, totalPrice: Number(e.target.value) })}
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">סטטוס</label>
                <select
                  value={booking.status}
                  onChange={e => setBooking({ ...booking, status: e.target.value as BookingStatus })}
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm"
                >
                  <option value={BookingStatus.PENDING}>בהמתנה</option>
                  <option value={BookingStatus.CONFIRMED}>מאושר</option>
                  <option value={BookingStatus.CANCELLED}>בוטל</option>
                  <option value={BookingStatus.COMPLETED}>הושלם</option>
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {loading ? 'שומר...' : 'שמור שינויים'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-sm"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
