import React from 'react';
import { getOccupancyBarColor, getOccupancyPercent } from '../../utils/bookingOccupancy';

interface Props {
  occupied: number;
  total: number;
  showLabel?: boolean;
}

const OccupancyBar: React.FC<Props> = ({ occupied, total, showLabel = true }) => {
  const percent = getOccupancyPercent(occupied, total);
  const colorClass = getOccupancyBarColor(percent);

  return (
    <div className="w-full space-y-1">
      {showLabel && total > 0 && (
        <p className="text-[10px] font-bold text-slate-500 text-center leading-none">
          {occupied}/{total} תפוסים
        </p>
      )}
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default OccupancyBar;
