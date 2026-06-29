import { describe, it, expect } from 'vitest';
import {
  createLocalDate,
  parseDateKey,
  formatDate,
  getCalendarDays,
  getWeekDays,
  getHebrewDayName,
  WEEKDAY_HEADERS_SUN_FIRST,
  addMonths,
} from './calendarUtils';

describe('calendarUtils', () => {
  describe('formatDate / parseDateKey', () => {
    it('round-trips a date key without day shift', () => {
      const date = createLocalDate(2026, 5, 15);
      const key = formatDate(date);
      expect(key).toBe('2026-06-15');
      const parsed = parseDateKey(key);
      expect(parsed.getDate()).toBe(15);
      expect(parsed.getMonth()).toBe(5);
      expect(getHebrewDayName(parsed)).toBe(getHebrewDayName(date));
    });
  });

  describe('getCalendarDays — Sunday-first grid', () => {
    it('returns exactly 42 cells', () => {
      expect(getCalendarDays(5, 2026)).toHaveLength(42);
    });

    it('June 2026: 1st is Monday under correct weekday column', () => {
      const days = getCalendarDays(5, 2026); // June 2026
      const june1 = days.find(d => d.isCurrentMonth && d.day === 1)!;
      expect(june1).toBeDefined();
      expect(june1.date.getDay()).toBe(1); // Monday

      const june1Index = days.indexOf(june1);
      const columnIndex = june1Index % 7;
      expect(WEEKDAY_HEADERS_SUN_FIRST[columnIndex]).toBe('שני');
    });

    it('first cell of June 2026 is Sunday May 31', () => {
      const days = getCalendarDays(5, 2026);
      const first = days[0];
      expect(first.day).toBe(31);
      expect(first.date.getMonth()).toBe(4); // May
      expect(first.date.getDay()).toBe(0); // Sunday
      expect(WEEKDAY_HEADERS_SUN_FIRST[0]).toBe('ראשון');
    });

    it('all current-month cells match their calendar day-of-week', () => {
      const days = getCalendarDays(5, 2026);
      for (const cell of days.filter(d => d.isCurrentMonth)) {
        const col = days.indexOf(cell) % 7;
        expect(WEEKDAY_HEADERS_SUN_FIRST[col]).toBe(getHebrewDayName(cell.date));
      }
    });
  });

  describe('getWeekDays', () => {
    it('returns 7 days starting Sunday', () => {
      const anchor = createLocalDate(2026, 5, 17); // Wed June 17
      const week = getWeekDays(anchor);
      expect(week).toHaveLength(7);
      expect(week[0].date.getDay()).toBe(0);
      expect(week[6].date.getDay()).toBe(6);
      expect(formatDate(week[3].date)).toBe('2026-06-17');
    });
  });

  describe('addMonths', () => {
    it('navigates months correctly', () => {
      expect(addMonths(0, 2026, 1)).toEqual({ month: 1, year: 2026 });
      expect(addMonths(0, 2026, -1)).toEqual({ month: 11, year: 2025 });
    });
  });
});
