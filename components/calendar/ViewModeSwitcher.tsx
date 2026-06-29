import React from 'react';
import { ViewMode } from '../../utils/calendarUtils';

interface Props {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'day', label: 'יום' },
  { id: 'week', label: 'שבוע' },
  { id: 'month', label: 'חודש' },
];

const ViewModeSwitcher: React.FC<Props> = ({ viewMode, onChange }) => (
  <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
    {VIEW_OPTIONS.map(opt => (
      <button
        key={opt.id}
        type="button"
        onClick={() => onChange(opt.id)}
        className={`
          px-4 py-2 rounded-lg text-xs font-black transition-all
          ${viewMode === opt.id
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'}
        `}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default ViewModeSwitcher;
