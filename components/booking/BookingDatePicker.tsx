import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Booking } from '../../types';
import {
  addMonths,
  formatDate,
  formatHebrewDate,
  getCalendarDays,
  HEBREW_MONTHS,
  isSameDay,
  isToday,
  parseDateKey,
  WEEKDAY_HEADERS_SHORT_SUN_FIRST,
} from '../../utils/calendarUtils';
import {
  isCheckInDateDisabled,
  isCheckOutDateDisabled,
} from '../../utils/bookingOccupancy';

interface Props {
  value: string;
  onChange: (dateStr: string) => void;
  mode: 'checkIn' | 'checkOut';
  unitId?: string;
  checkIn?: string;
  existingBookings?: Booking[];
  excludeBookingId?: string;
  error?: string;
  disabled?: boolean;
}

const BookingDatePicker: React.FC<Props> = ({
  value,
  onChange,
  mode,
  unitId = '',
  checkIn = '',
  existingBookings = [],
  excludeBookingId,
  error,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const initialDate = value ? parseDateKey(value) : new Date();
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (value) {
      const d = parseDateKey(value);
      setViewMonth(d.getMonth());
      setViewYear(d.getFullYear());
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const calendarDays = getCalendarDays(viewMonth, viewYear);
  const selectedDate = value ? parseDateKey(value) : null;

  const isDateDisabled = (dateStr: string): boolean => {
    if (!unitId) return false;
    if (mode === 'checkIn') {
      return isCheckInDateDisabled(unitId, dateStr, existingBookings, excludeBookingId);
    }
    return isCheckOutDateDisabled(unitId, checkIn, dateStr, existingBookings, excludeBookingId);
  };

  const handleSelect = (date: Date) => {
    const dateStr = formatDate(date);
    if (isDateDisabled(dateStr)) return;
    onChange(dateStr);
    setOpen(false);
  };

  const navigatePrevious = () => {
    const { month, year } = addMonths(viewMonth, viewYear, -1);
    setViewMonth(month);
    setViewYear(year);
  };

  const navigateNext = () => {
    const { month, year } = addMonths(viewMonth, viewYear, 1);
    setViewMonth(month);
    setViewYear(year);
  };

  const displayValue = value
    ? `${value} (${formatHebrewDate(value)})`
    : 'בחר תאריך';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled || (mode === 'checkOut' && !checkIn)}
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 border rounded-2xl px-5 py-4 text-sm text-right focus:ring-2 focus:ring-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-rose-300 bg-rose-50/30' : 'border-transparent'
        }`}
      >
        <Calendar size={18} className="text-slate-400 shrink-0" />
        <span className={`flex-1 truncate ${value ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
          {mode === 'checkOut' && !checkIn ? 'בחר תאריך כניסה תחילה' : displayValue}
        </span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-[300] bg-white border border-slate-200 rounded-2xl shadow-xl p-4"
          dir="rtl"
        >
          {!unitId && (
            <p className="text-xs text-amber-600 font-bold mb-3 text-center">
              בחר יחידה כדי לראות זמינות
            </p>
          )}

          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={navigateNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="חודש הבא"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-black text-slate-800">
              {HEBREW_MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={navigatePrevious}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="חודש קודם"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_HEADERS_SHORT_SUN_FIRST.map(name => (
              <div key={name} className="text-center text-[10px] font-black text-slate-400 py-1">
                {name}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayInfo, idx) => {
              const dateStr = formatDate(dayInfo.date);
              const occupied = isDateDisabled(dateStr);
              const selected = selectedDate ? isSameDay(dayInfo.date, selectedDate) : false;
              const today = isToday(dayInfo.date);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={occupied}
                  onClick={() => handleSelect(dayInfo.date)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-xs font-black transition-all
                    ${!dayInfo.isCurrentMonth ? 'text-slate-300' : ''}
                    ${occupied
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                      : selected
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                        : today
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : dayInfo.isCurrentMonth
                            ? 'text-slate-800 hover:bg-slate-100'
                            : 'hover:bg-slate-50'
                    }
                  `}
                >
                  {dayInfo.day}
                </button>
              );
            })}
          </div>

          {unitId && (
            <p className="text-[10px] text-slate-400 font-bold mt-3 text-center">
              תאריכים באפור תפוסים ולא ניתנים לבחירה
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingDatePicker;
