import React from 'react';
import { Booking, ZimmerUnit } from '../../types';
import { DayOccupancySummary, getDayOccupancy } from '../../utils/bookingOccupancy';
import { getHebrewDayName, getHebrewMonthName } from '../../utils/calendarUtils';
import DaySidePanel from './DaySidePanel';

interface Props {
  date: Date;
  units: ZimmerUnit[];
  bookings: Booking[];
  onAddBooking: () => void;
  onBookUnit: (unitId: string) => void;
  onViewBooking: (booking: Booking) => void;
}

const DayDetailView: React.FC<Props> = ({
  date,
  units,
  bookings,
  onAddBooking,
  onBookUnit,
  onViewBooking,
}) => {
  const occupancy: DayOccupancySummary = getDayOccupancy(date, units, bookings);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 px-2">
        <h3 className="text-xl font-black text-slate-800">
          {getHebrewDayName(date)}, {date.getDate()} {getHebrewMonthName(date)} {date.getFullYear()}
        </h3>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {occupancy.occupiedCount} מתוך {occupancy.totalUnits} יחידות תפוסות
        </p>
      </div>
      <div className="flex-1 overflow-hidden rounded-[2rem] border border-slate-100 bg-white">
        <DaySidePanel
          date={date}
          occupancy={occupancy}
          onClose={() => {}}
          onAddBooking={onAddBooking}
          onBookUnit={onBookUnit}
          onViewBooking={onViewBooking}
          embedded
        />
      </div>
    </div>
  );
};

export default DayDetailView;
