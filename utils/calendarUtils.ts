export interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
}

export const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
export const HEBREW_DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const HEBREW_DAY_NAMES_SHORT = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''];

/** כותרות ימים — ראשון ראשון (תואם getCalendarDays / getWeekDays) */
export const WEEKDAY_HEADERS_SUN_FIRST = HEBREW_DAY_NAMES;
export const WEEKDAY_HEADERS_SHORT_SUN_FIRST = HEBREW_DAY_NAMES_SHORT;

/** תאריך מקומי בצהריים — מונע סטיות timezone */
export const createLocalDate = (year: number, month: number, day: number): Date =>
  new Date(year, month, day, 12, 0, 0, 0);

export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return createLocalDate(y, m - 1, d);
};

export const getCalendarDays = (month: number, year: number): CalendarDay[] => {
  const firstDay = createLocalDate(year, month, 1);
  const lastDay = createLocalDate(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = ראשון

  const days: CalendarDay[] = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = createLocalDate(prevYear, prevMonth + 1, 0).getDate();
    const date = createLocalDate(prevYear, prevMonth, daysInPrevMonth - startingDayOfWeek + i + 1);
    days.push({ day: date.getDate(), date, isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = createLocalDate(year, month, day);
    days.push({ day, date, isCurrentMonth: true });
  }

  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const date = createLocalDate(nextYear, nextMonth, i);
    days.push({ day: i, date, isCurrentMonth: false });
  }

  return days;
};

export const getWeekDays = (anchorDate: Date): CalendarDay[] => {
  const sunday = createLocalDate(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    anchorDate.getDate() - anchorDate.getDay()
  );

  return Array.from({ length: 7 }, (_, i) => {
    const date = createLocalDate(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
    const isCurrentMonth = date.getMonth() === anchorDate.getMonth();
    return { day: date.getDate(), date, isCurrentMonth };
  });
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

export const isShabbat = (date: Date): boolean => date.getDay() === 6;

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getHebrewDayName = (date: Date): string => HEBREW_DAY_NAMES[date.getDay()];

export const getHebrewMonthName = (date: Date): string => HEBREW_MONTHS[date.getMonth()];

export const getHebrewDateForMonth = (month: number, year: number): string => {
  const firstDay = new Date(year, month, 1);
  return `${getHebrewDayName(firstDay)}, ${firstDay.getDate()} ב${getHebrewMonthName(firstDay)} ${year}`;
};

export const formatHebrewDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return `${getHebrewDayName(date)}, ${date.getDate()} ב${getHebrewMonthName(date)} ${date.getFullYear()}`;
};

export const getHoliday = (dateStr: string): string | null => {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const holidays: Record<string, string> = {
    '01-01': 'ראש השנה האזרחית',
    '04-22': 'יום הזיכרון לשואה ולגבורה',
    '04-23': 'יום הזיכרון לחללי מערכות ישראל',
    '04-24': 'יום העצמאות',
    '05-14': 'יום ירושלים',
    '09-01': 'ראש השנה',
    '09-10': 'יום כיפור',
    '09-15': 'סוכות',
    '09-22': 'שמיני עצרת',
    '09-23': 'שמחת תורה',
    '12-18': 'חנוכה',
    '12-25': 'חנוכה',
  };

  const key = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return holidays[key] || null;
};

export type ViewMode = 'day' | 'week' | 'month';

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (month: number, year: number, delta: number): { month: number; year: number } => {
  const d = new Date(year, month + delta, 1);
  return { month: d.getMonth(), year: d.getFullYear() };
};

export const addWeeks = (date: Date, weeks: number): Date => addDays(date, weeks * 7);
