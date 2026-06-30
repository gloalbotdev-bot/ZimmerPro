import React from 'react';
import { Booking, ZimmerUnit } from '../../types';
import {
  CalendarDay,
  formatDate,
  getHebrewDayName,
  getWeekDays,
  isShabbat,
  isToday,
  WEEKDAY_HEADERS_SUN_FIRST,
} from '../../utils/calendarUtils';
import { getDayOccupancy, getStatusBadgeClasses, getStatusLabel, isDayFullyBooked } from '../../utils/bookingOccupancy';
import OccupancyBar from './OccupancyBar';

interface Props {
  anchorDate: Date;
  units: ZimmerUnit[];
  bookings: Booking[];
  selectedDate: Date | null;
  onDayClick: (date: Date) => void;
  onDayHover: (dateKey: string | null, rect?: DOMRect) => void;
}

const WeekGridView: React.FC<Props> = ({
  anchorDate,
  units,
  bookings,
  selectedDate,
  onDayClick,
  onDayHover,
}) => {
  const weekDays: CalendarDay[] = getWeekDays(anchorDate);

  const isSelected = (date: Date) =>
    selectedDate !== null &&
    date.getDate() === selectedDate.getDate() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getFullYear() === selectedDate.getFullYear();

  return (
    <div
      className="flex flex-col flex-1 min-h-0 overflow-y-auto rounded-xl border-2 border-slate-300"
      dir="rtl"
    >
      <div className="grid grid-cols-7 gap-px bg-slate-300 min-h-[400px]">
        {WEEKDAY_HEADERS_SUN_FIRST.map(name => (
          <div
            key={name}
            className={`text-center py-3 bg-slate-100 sticky top-0 z-10 ${
              name === 'שבת' ? 'bg-indigo-100' : ''
            }`}
          >
            <span
              className={`text-sm font-black block ${
                name === 'שבת' ? 'text-indigo-800' : 'text-slate-700'
              }`}
            >
              {name}
            </span>
          </div>
        ))}

        {weekDays.map((dayInfo, idx) => {
          const occupancy = getDayOccupancy(dayInfo.date, units, bookings);
          const today = isToday(dayInfo.date);
          const shabbat = isShabbat(dayInfo.date);
          const selected = isSelected(dayInfo.date);
          const fullyBooked = isDayFullyBooked(occupancy);
          const dateKey = formatDate(dayInfo.date);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onDayClick(dayInfo.date)}
              onMouseEnter={e => onDayHover(dateKey, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={() => onDayHover(null)}
              className={`
                flex flex-col p-3 text-right transition-all min-h-[200px] w-full
                ${fullyBooked && dayInfo.isCurrentMonth ? 'bg-slate-200/80 opacity-75' : ''}
                ${!fullyBooked ? 'hover:bg-blue-50' : ''}
                ${!dayInfo.isCurrentMonth ? 'bg-slate-100 opacity-60' : fullyBooked ? '' : 'bg-white'}
                ${shabbat && dayInfo.isCurrentMonth && !fullyBooked ? '!bg-indigo-50' : ''}
                ${today ? 'ring-2 ring-inset ring-blue-500' : ''}
                ${selected ? 'ring-2 ring-inset ring-indigo-600 !bg-indigo-50/40 z-[1]' : ''}
              `}
            >
              <div className="mb-2 relative">
                <span className={`text-lg font-black ${fullyBooked ? 'text-slate-500' : shabbat ? 'text-indigo-700' : 'text-slate-800'}`}>
                  {dayInfo.day}
                </span>
                {fullyBooked && dayInfo.isCurrentMonth && (
                  <span className="absolute top-0 left-0 text-[8px] font-black text-slate-500 bg-slate-300 px-1.5 py-0.5 rounded">
                    מלא
                  </span>
                )}
                <p className="text-[10px] font-bold text-slate-500">{getHebrewDayName(dayInfo.date)}</p>
              </div>

              {occupancy.totalUnits > 0 && (
                <OccupancyBar occupied={occupancy.occupiedCount} total={occupancy.totalUnits} />
              )}

              <div className="mt-3 space-y-1.5 flex-1 overflow-hidden">
                {occupancy.units
                  .filter(u => u.booking)
                  .slice(0, 4)
                  .map(({ unit, booking, status }) => (
                    <div key={unit.id} className="text-[10px] truncate">
                      <span className="font-black text-slate-700">{unit.name}</span>
                      <span className={`mr-1 px-1 rounded text-[8px] font-black ${getStatusBadgeClasses(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                      {booking && (
                        <p className="text-slate-500 font-medium truncate">{booking.guestName}</p>
                      )}
                    </div>
                  ))}
                {occupancy.occupiedCount > 4 && (
                  <p className="text-[9px] text-slate-400 font-bold">+{occupancy.occupiedCount - 4} נוספים</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeekGridView;
