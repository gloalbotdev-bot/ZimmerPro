import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Language, translations } from '../../translations';
import { ViewMode, getHebrewDateForMonth, getHebrewDayName, getHebrewMonthName } from '../../utils/calendarUtils';
import ViewModeSwitcher from './ViewModeSwitcher';

interface Props {
  lang: Language;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  currentMonth: number;
  currentYear: number;
  anchorDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

const CalendarHeader: React.FC<Props> = ({
  lang,
  viewMode,
  onViewModeChange,
  currentMonth,
  currentYear,
  anchorDate,
  onPrevious,
  onNext,
  onToday,
}) => {
  const t = translations[lang];

  const getTitle = () => {
    if (viewMode === 'month') {
      return `${getHebrewMonthName(new Date(currentYear, currentMonth, 1))} ${currentYear}`;
    }
    if (viewMode === 'week') {
      return `שבוע — ${getHebrewMonthName(anchorDate)} ${anchorDate.getFullYear()}`;
    }
    return `${anchorDate.getDate()} ${getHebrewMonthName(anchorDate)} ${anchorDate.getFullYear()} — ${getHebrewDayName(anchorDate)}`;
  };

  const getSubtitle = () => {
    if (viewMode === 'month') {
      return getHebrewDateForMonth(currentMonth, currentYear);
    }
    return null;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.calendar}</h2>
        <p className="text-slate-500 font-medium text-sm">תצוגת תפוסה — יום / שבוע / חודש</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ViewModeSwitcher viewMode={viewMode} onChange={onViewModeChange} />

        <button
          type="button"
          onClick={onToday}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2"
        >
          <CalendarIcon size={16} />
          היום
        </button>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <button
            type="button"
            onClick={onPrevious}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-all"
            aria-label="הקודם"
          >
            {t.dir === 'rtl' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <div className="min-w-[160px] text-center px-2">
            <div className="font-black text-slate-800 text-base">{getTitle()}</div>
            {getSubtitle() && (
              <div className="text-[10px] text-slate-500 font-bold mt-0.5">{getSubtitle()}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onNext}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-all"
            aria-label="הבא"
          >
            {t.dir === 'rtl' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
