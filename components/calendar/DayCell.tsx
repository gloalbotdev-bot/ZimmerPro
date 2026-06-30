import React, { useRef } from 'react';
import { CalendarDay, formatDate, getHebrewDayName, isShabbat, isToday } from '../../utils/calendarUtils';
import { DayOccupancySummary } from '../../utils/bookingOccupancy';
import OccupancyBar from './OccupancyBar';

interface Props {
  dayInfo: CalendarDay;
  occupancy: DayOccupancySummary;
  isSelected: boolean;
  fullyBooked?: boolean;
  onClick: (date: Date) => void;
  onHover: (dateKey: string | null, rect?: DOMRect) => void;
}

const DayCell: React.FC<Props> = ({ dayInfo, occupancy, isSelected, fullyBooked = false, onClick, onHover }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const today = isToday(dayInfo.date);
  const shabbat = isShabbat(dayInfo.date);
  const dateKey = formatDate(dayInfo.date);

  const handleMouseEnter = () => {
    if (ref.current) {
      onHover(dateKey, ref.current.getBoundingClientRect());
    }
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onClick(dayInfo.date)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        relative flex flex-col justify-between p-2 min-h-[96px] w-full
        transition-all text-right
        ${fullyBooked && dayInfo.isCurrentMonth ? 'bg-slate-200/80 opacity-75' : ''}
        ${!fullyBooked ? 'hover:bg-blue-50' : ''}
        ${!dayInfo.isCurrentMonth ? 'bg-slate-100 opacity-60' : fullyBooked ? '' : 'bg-white'}
        ${shabbat && dayInfo.isCurrentMonth && !fullyBooked ? '!bg-indigo-50' : ''}
        ${today ? 'ring-2 ring-inset ring-blue-500' : ''}
        ${isSelected ? 'ring-2 ring-inset ring-indigo-600 !bg-indigo-50/40 z-[1]' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`text-base font-black leading-none ${
            shabbat ? 'text-indigo-700' : today ? 'text-blue-700' : 'text-slate-800'
          }`}
        >
          {dayInfo.day}
        </span>
        {dayInfo.isCurrentMonth && (
          <span className="text-[10px] font-bold text-slate-500 leading-none">
            {getHebrewDayName(dayInfo.date)}
          </span>
        )}
      </div>

      {today && (
        <span className="absolute top-1.5 left-1.5 text-[8px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
          היום
        </span>
      )}

      {fullyBooked && dayInfo.isCurrentMonth && !today && (
        <span className="absolute top-1.5 left-1.5 text-[8px] font-black text-slate-500 bg-slate-300 px-1.5 py-0.5 rounded">
          מלא
        </span>
      )}

      {dayInfo.isCurrentMonth && occupancy.totalUnits > 0 && (
        <div className="mt-auto pt-2">
          <OccupancyBar occupied={occupancy.occupiedCount} total={occupancy.totalUnits} />
        </div>
      )}
    </button>
  );
};

export default DayCell;
