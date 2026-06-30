import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { ZimmerUnit } from '../../types';
import { Language, translations } from '../../translations';

interface Props {
  eligibleUnits: ZimmerUnit[];
  guestName: string;
  lang: Language;
  onSave: (data: { unitId: string; rating: number | null; comment: string; date: string }) => Promise<void>;
  onClose: () => void;
}

const GuestReviewForm: React.FC<Props> = ({ eligibleUnits, guestName, lang, onSave, onClose }) => {
  const t = translations[lang];
  const [unitId, setUnitId] = useState(eligibleUnits[0]?.id || '');
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!unitId || !comment.trim()) return;
    try {
      setSaving(true);
      await onSave({ unitId, rating, comment: comment.trim(), date });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl z-10 animate-scaleIn flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
          <X size={24} className="text-slate-400 cursor-pointer" onClick={onClose} />
          <h3 className="text-xl font-black text-slate-800">{t.add_review}</h3>
        </div>

        <div className="p-8 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">בחר יחידה</label>
            <select
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
            >
              <option value="">בחר יחידה</option>
              {eligibleUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {eligibleUnits.length === 0 && (
              <p className="text-xs text-rose-500 mt-2 font-bold">אין יחידות זכאיות — ניתן לכתוב ביקורת רק על יחידות ששהית בהן ב-5 השנים האחרונות</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">תאריך</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">שם האורח</label>
              <input
                type="text"
                value={guestName}
                readOnly
                className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">דירוג (אופציונלי)</label>
            <div className="flex gap-2 justify-center py-2 bg-slate-50 rounded-2xl">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(rating === num ? null : num)}
                  className={`p-2 transition-all ${rating != null && rating >= num ? 'text-amber-500' : 'text-slate-300'} ${rating === num ? 'scale-125' : ''}`}
                >
                  <Star size={24} fill={rating != null && rating >= num ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">ביקורת</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm h-32"
              placeholder="איך היה האירוח?"
            />
          </div>

          <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
            * הערה: לאחר שמירה, הביקורת תעבור לבדיקה ובירור מול בעל הצימר לפני פרסום.
          </p>
        </div>

        <div className="p-8 border-t border-slate-100 bg-white flex gap-4 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !unitId || !comment.trim()}
            className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {saving ? 'שומר...' : t.save}
          </button>
          <button onClick={onClose} className="px-10 py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl">{t.cancel}</button>
        </div>
      </div>
    </div>
  );
};

export default GuestReviewForm;
