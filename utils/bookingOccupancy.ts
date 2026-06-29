import { Booking, BookingStatus, UnitStatus, ZimmerUnit } from '../types';
import { formatDate } from './calendarUtils';

export type UnitDayStatus = 'available' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'out_of_range';

export interface UnitDayInfo {
  unit: ZimmerUnit;
  booking?: Booking;
  status: UnitDayStatus;
  nights?: number;
}

export interface DayOccupancySummary {
  totalUnits: number;
  occupiedCount: number;
  units: UnitDayInfo[];
}

export const isNightOccupied = (
  unitId: string,
  date: Date,
  bookings: Booking[],
  excludeBookingId?: string
): boolean => {
  const dateStr = formatDate(date);
  return bookings.some(b => {
    if (b.unitId !== unitId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status === BookingStatus.CANCELLED) return false;
    return dateStr >= b.checkIn && dateStr < b.checkOut;
  });
};

export const getBookingForUnitOnDate = (
  unitId: string,
  date: Date,
  bookings: Booking[]
): Booking | undefined => {
  const dateStr = formatDate(date);
  return bookings.find(b => {
    if (b.unitId !== unitId) return false;
    if (b.status === BookingStatus.CANCELLED) return false;
    return dateStr >= b.checkIn && dateStr < b.checkOut;
  });
};

export const bookingsOverlap = (
  unitId: string,
  checkIn: string,
  checkOut: string,
  bookings: Booking[],
  excludeBookingId?: string
): boolean => {
  return bookings.some(b => {
    if (b.unitId !== unitId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status === BookingStatus.CANCELLED) return false;
    return b.checkIn < checkOut && b.checkOut > checkIn;
  });
};

const mapBookingToStatus = (booking: Booking): UnitDayStatus => {
  switch (booking.status) {
    case BookingStatus.CONFIRMED: return 'confirmed';
    case BookingStatus.PENDING: return 'pending';
    case BookingStatus.COMPLETED: return 'completed';
    case BookingStatus.CANCELLED: return 'cancelled';
    default: return 'pending';
  }
};

const countNights = (checkIn: string, checkOut: string): number => {
  const inDate = new Date(checkIn + 'T00:00:00');
  const outDate = new Date(checkOut + 'T00:00:00');
  return Math.max(0, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
};

export const getDayOccupancy = (
  date: Date,
  units: ZimmerUnit[],
  bookings: Booking[]
): DayOccupancySummary => {
  const unitInfos: UnitDayInfo[] = units.map(unit => {
    if (unit.status === UnitStatus.MAINTENANCE) {
      return { unit, status: 'out_of_range' as UnitDayStatus };
    }

    const booking = getBookingForUnitOnDate(unit.id, date, bookings);
    if (!booking) {
      return { unit, status: 'available' as UnitDayStatus };
    }

    return {
      unit,
      booking,
      status: mapBookingToStatus(booking),
      nights: countNights(booking.checkIn, booking.checkOut),
    };
  });

  const occupiedCount = unitInfos.filter(
    u => u.status !== 'available' && u.status !== 'out_of_range'
  ).length;

  return {
    totalUnits: units.length,
    occupiedCount,
    units: unitInfos,
  };
};

export const getOccupancyPercent = (occupied: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((occupied / total) * 100);
};

export const getOccupancyBarColor = (percent: number): string => {
  if (percent === 0) return 'bg-slate-200';
  if (percent <= 50) return 'bg-blue-400';
  if (percent <= 80) return 'bg-orange-400';
  return 'bg-orange-600';
};

export const getStatusLabel = (status: UnitDayStatus): string => {
  switch (status) {
    case 'confirmed': return 'מאושר';
    case 'pending': return 'בהמתנה';
    case 'available': return 'פנוי';
    case 'completed': return 'הושלם';
    case 'cancelled': return 'בוטל';
    case 'out_of_range': return 'מחוץ לטווח';
    default: return status;
  }
};

export const getStatusBadgeClasses = (status: UnitDayStatus): string => {
  switch (status) {
    case 'confirmed':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'available':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'completed':
      return 'bg-slate-50 text-slate-600 border-slate-200';
    case 'out_of_range':
      return 'bg-slate-100 text-slate-400 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};
