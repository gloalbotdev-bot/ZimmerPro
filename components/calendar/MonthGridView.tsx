import React from 'react';
import { Booking, ZimmerUnit } from '../../types';
import { CalendarDay, WEEKDAY_HEADERS_SUN_FIRST } from '../../utils/calendarUtils';
import { DayOccupancySummary, getDayOccupancy, isDayFullyBooked } from '../../utils/bookingOccupancy';
import DayCell from './DayCell';

interface Props {
  calendarDays: CalendarDay[];
  units: ZimmerUnit[];
  bookings: Booking[];
  selectedDate: Date | null;
  onDayClick: (date: Date) => void;
  onDayHover: (dateKey: string | null, rect?: DOMRect) => void;
}

const MonthGridView: React.FC<Props> = ({
  calendarDays,
  units,
  bookings,
  selectedDate,
  onDayClick,
  onDayHover,
}) => {
  const getOccupancy = (date: Date): DayOccupancySummary =>
    getDayOccupancy(date, units, bookings);

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
      {/* רשת אחת: כותרות + תאים — יישור מדויק, ראשון מימין */}
      <div className="grid grid-cols-7 gap-px bg-slate-300">
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

        {calendarDays.map((dayInfo, idx) => {
          const occupancy = getOccupancy(dayInfo.date);
          return (
          <DayCell
            key={idx}
            dayInfo={dayInfo}
            occupancy={occupancy}
            isSelected={isSelected(dayInfo.date)}
            fullyBooked={isDayFullyBooked(occupancy)}
            onClick={onDayClick}
            onHover={onDayHover}
          />
          );
        })}
      </div>
    </div>
  );
};

export default MonthGridView;
