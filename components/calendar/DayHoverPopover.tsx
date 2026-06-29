import React from 'react';
import { Booking, ZimmerUnit } from '../../types';
import {
  DayOccupancySummary,
  getDayOccupancy,
  getStatusBadgeClasses,
  getStatusLabel,
} from '../../utils/bookingOccupancy';
import { getHebrewDayName, getHebrewMonthName, parseDateKey } from '../../utils/calendarUtils';

interface Props {
  dateKey: string;
  units: ZimmerUnit[];
  bookings: Booking[];
  anchorRect?: DOMRect;
}

const DayHoverPopover: React.FC<Props> = ({ dateKey, units, bookings, anchorRect }) => {
  const date = parseDateKey(dateKey);
  const occupancy: DayOccupancySummary = getDayOccupancy(date, units, bookings);

  const style: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        top: Math.min(anchorRect.bottom + 8, window.innerHeight - 320),
        right: Math.min(
          Math.max(window.innerWidth - anchorRect.right - 8, 8),
          window.innerWidth - 280
        ),
        zIndex: 1000,
      }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 };

  return (
    <div
      style={style}
      className="w-64 max-h-72 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 pointer-events-none animate-fadeIn"
      dir="rtl"
    >
      <p className="text-xs font-black text-slate-800 mb-3 border-b border-slate-100 pb-2">
        {date.getDate()} {getHebrewMonthName(date)} — {getHebrewDayName(date)}
      </p>

      {occupancy.totalUnits === 0 ? (
        <p className="text-xs text-slate-400 font-bold">אין יחידות להצגה</p>
      ) : (
        <div className="space-y-2">
          {occupancy.units.map(({ unit, booking, status }) => (
            <div key={unit.id} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-slate-700 truncate">{unit.name}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 ${getStatusBadgeClasses(status)}`}>
                  {getStatusLabel(status)}
                </span>
              </div>
              {booking && (
                <div className="text-[10px] text-slate-600 font-medium space-y-0.5 mr-1">
                  <p className="font-black text-slate-700">{booking.guestName}</p>
                  <p>{booking.guestPhone}</p>
                  <p>{booking.checkIn} → {booking.checkOut}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-400 font-bold mt-3 pt-2 border-t border-slate-100">
        {occupancy.occupiedCount}/{occupancy.totalUnits} תפוסים
      </p>
    </div>
  );
};

export default DayHoverPopover;
