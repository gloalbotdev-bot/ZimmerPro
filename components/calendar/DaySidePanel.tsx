import React from 'react';
import { Plus, X, Phone, Calendar } from 'lucide-react';
import { Booking } from '../../types';
import {
  DayOccupancySummary,
  UnitDayInfo,
  getStatusBadgeClasses,
  getStatusLabel,
} from '../../utils/bookingOccupancy';
import { formatHebrewDate, getHebrewDayName, getHebrewMonthName } from '../../utils/calendarUtils';

interface Props {
  date: Date;
  occupancy: DayOccupancySummary;
  onClose: () => void;
  onAddBooking: () => void;
  onBookUnit: (unitId: string) => void;
  onViewBooking: (booking: Booking) => void;
  embedded?: boolean;
}

const UnitCard: React.FC<{
  info: UnitDayInfo;
  onBookUnit: (unitId: string) => void;
  onViewBooking: (booking: Booking) => void;
}> = ({ info, onBookUnit, onViewBooking }) => {
  const { unit, booking, status, nights } = info;
  const isAvailable = status === 'available';
  const isOccupied = booking && status !== 'available' && status !== 'out_of_range';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAvailable) onBookUnit(unit.id);
    else if (isOccupied && booking) onViewBooking(booking);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'out_of_range'}
      className={`
        w-full text-right p-4 rounded-2xl border transition-all
        ${isAvailable ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer' : ''}
        ${isOccupied ? 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer' : ''}
        ${status === 'out_of_range' ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-black text-slate-800">{unit.name}</p>
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border shrink-0 ${getStatusBadgeClasses(status)}`}>
          {getStatusLabel(status)}
        </span>
      </div>

      {booking ? (
        <div className="space-y-1.5 text-right">
          <p className="text-sm font-black text-slate-700">{booking.guestName}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Phone size={12} className="shrink-0" />
            <span>{booking.guestPhone}</span>
          </div>
          <div className="flex items-start gap-1.5 text-xs text-slate-600 font-bold bg-slate-50 rounded-lg p-2 mt-1">
            <Calendar size={12} className="shrink-0 mt-0.5" />
            <div>
              <p>כניסה: {booking.checkIn}</p>
              <p className="text-slate-400 font-medium text-[10px]">{formatHebrewDate(booking.checkIn)}</p>
              <p className="mt-1">יציאה: {booking.checkOut}</p>
              <p className="text-slate-400 font-medium text-[10px]">{formatHebrewDate(booking.checkOut)}</p>
              {nights !== undefined && nights > 0 && (
                <p className="text-indigo-600 font-black mt-1">{nights} לילות</p>
              )}
            </div>
          </div>
        </div>
      ) : isAvailable ? (
        <p className="text-xs text-emerald-600 font-bold">לחץ להזמנה ←</p>
      ) : null}
    </button>
  );
};

const DaySidePanel: React.FC<Props> = ({
  date,
  occupancy,
  onClose,
  onAddBooking,
  onBookUnit,
  onViewBooking,
  embedded = false,
}) => {
  const handleAddBooking = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddBooking();
  };

  const content = (
    <aside
      className={
        embedded
          ? 'flex flex-col h-full bg-white'
          : 'fixed top-0 left-0 h-full w-full max-w-sm bg-white border-r border-slate-200 shadow-2xl z-50 flex flex-col animate-fadeIn lg:static lg:shadow-none lg:border lg:rounded-[2rem] lg:h-full lg:max-h-none lg:shrink-0'
      }
      dir="rtl"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
        <div>
          <h3 className="text-lg font-black text-slate-800">
            {getHebrewMonthName(date)} {date.getDate()}: פירוט הזמנות
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">{getHebrewDayName(date)}</p>
        </div>
        {!embedded && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-50"
            aria-label="סגור"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-4 shrink-0">
        <button
          type="button"
          onClick={handleAddBooking}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-black text-sm hover:bg-slate-800 transition-all"
        >
          <Plus size={16} />
          הזמנה חדשה
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
        {occupancy.totalUnits === 0 ? (
          <p className="text-center text-slate-400 font-bold py-10">אין יחידות להצגה ביומן</p>
        ) : (
          occupancy.units.map(info => (
            <UnitCard
              key={info.unit.id}
              info={info}
              onBookUnit={onBookUnit}
              onViewBooking={onViewBooking}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-200 shrink-0">
        <p className="text-xs font-black text-slate-500 text-center">
          {occupancy.occupiedCount} מתוך {occupancy.totalUnits} תפוסים
        </p>
      </div>
    </aside>
  );

  if (embedded) return content;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} aria-hidden />
      {content}
    </>
  );
};

export default DaySidePanel;
