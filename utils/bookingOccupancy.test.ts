import { describe, it, expect } from 'vitest';
import { BookingStatus, UnitStatus } from '../types';
import {
  getDayOccupancy,
  bookingsOverlap,
  isNightOccupied,
  getOccupancyPercent,
  getOccupancyBarColor,
} from './bookingOccupancy';
import { createLocalDate, parseDateKey } from './calendarUtils';

const unit = (id: string, name: string) => ({
  id,
  linkType: 'user' as const,
  linkedToId: 'u1',
  name,
  description: '',
  pricePerNight: 500,
  capacity: 4,
  status: UnitStatus.AVAILABLE,
  images: [],
});

const booking = (
  id: string,
  unitId: string,
  checkIn: string,
  checkOut: string,
  status = BookingStatus.CONFIRMED
) => ({
  id,
  unitId,
  guestName: 'אורח',
  guestPhone: '050-0000000',
  checkIn,
  checkOut,
  totalPrice: 1000,
  status,
});

describe('bookingOccupancy', () => {
  const units = [unit('u1', 'צימר א'), unit('u2', 'צימר ב')];
  const bookings = [booking('b1', 'u1', '2026-06-10', '2026-06-12')];

  it('counts occupied units on check-in night (inclusive)', () => {
    const summary = getDayOccupancy(parseDateKey('2026-06-10'), units, bookings);
    expect(summary.occupiedCount).toBe(1);
    expect(summary.units[0].status).toBe('confirmed');
    expect(summary.units[1].status).toBe('available');
  });

  it('check-out day is not occupied', () => {
    const summary = getDayOccupancy(parseDateKey('2026-06-12'), units, bookings);
    expect(summary.occupiedCount).toBe(0);
  });

  it('ignores cancelled bookings', () => {
    const cancelled = [booking('b2', 'u1', '2026-06-10', '2026-06-12', BookingStatus.CANCELLED)];
    const summary = getDayOccupancy(parseDateKey('2026-06-10'), units, cancelled);
    expect(summary.occupiedCount).toBe(0);
  });

  it('detects overlapping bookings', () => {
    expect(bookingsOverlap('u1', '2026-06-11', '2026-06-13', bookings)).toBe(true);
    expect(bookingsOverlap('u1', '2026-06-12', '2026-06-14', bookings)).toBe(false);
    expect(bookingsOverlap('u2', '2026-06-10', '2026-06-12', bookings)).toBe(false);
  });

  it('excludes booking id when checking overlap for edit', () => {
    expect(bookingsOverlap('u1', '2026-06-10', '2026-06-12', bookings, 'b1')).toBe(false);
  });

  it('isNightOccupied matches getDayOccupancy', () => {
    const date = createLocalDate(2026, 5, 11);
    expect(isNightOccupied('u1', date, bookings)).toBe(true);
    expect(isNightOccupied('u2', date, bookings)).toBe(false);
  });

  it('occupancy percent and bar colors', () => {
    expect(getOccupancyPercent(1, 2)).toBe(50);
    expect(getOccupancyPercent(0, 0)).toBe(0);
    expect(getOccupancyBarColor(0)).toBe('bg-slate-200');
    expect(getOccupancyBarColor(30)).toBe('bg-blue-400');
    expect(getOccupancyBarColor(70)).toBe('bg-orange-400');
    expect(getOccupancyBarColor(90)).toBe('bg-orange-600');
  });
});
