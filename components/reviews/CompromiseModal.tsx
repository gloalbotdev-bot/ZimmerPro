import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Review } from '../../types';

const COMPROMISE_OPTIONS = [
  { type: 'discount_20' as const, label: '20% הנחה לשהייה הבאה' },
  { type: 'credit_150' as const, label: 'זיכוי 150 ש"ח במזומן' },
  { type: 'reasoned_response' as const, label: 'תגובה מנומקת (ללא פשרה)' },
  { type: 'custom' as const, label: 'הצעה מותאמת אישית' },
];

interface Props {
  review: Review;
  unitName: string;
  onSend: (data: { type: string; customText: string }) => Promise<void>;
  onClose: () => void;
}

const CompromiseModal: React.FC<Props> = ({ review, unitName, onSend, onClose }) => {
  const [selectedType, setSelectedType] = useState<string>('discount_20');
  const [customText, setCustomText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    try {
      setSending(true);
      await onSend({ type: selectedType, customText });
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl z-10 animate-scaleIn flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <X size={24} className="text-slate-400 cursor-pointer" onClick={onClose} />
          <h3 className="text-xl font-black text-slate-800">הצעת פשרה</h3>
        </div>

        <div className="p-8 space-y-5">
          <div className="bg-slate-50 rounded-2xl p-4 text-right">
            <p className="text-xs font-bold text-indigo-500 uppercase mb-1">{unitName}</p>
            <p className="text-sm font-black text-slate-800">{review.guestName}</p>
            <p className="text-sm text-slate-600 italic mt-2">"{review.comment}"</p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">בחר הצעת פשרה</label>
            <div className="space-y-2">
              {COMPROMISE_OPTIONS.map(opt => (
                <label
                  key={opt.type}
                  className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border-2 transition-all ${
                    selectedType === opt.type ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="compromise"
                    value={opt.type}
                    checked={selectedType === opt.type}
                    onChange={() => setSelectedType(opt.type)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm font-bold text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">כתוב הצעת פשרה מותאמת</label>
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm h-28"
              placeholder="פרט את הצעתך לאורח..."
            />
          </div>

          <p className="text-xs text-slate-500">מצב: מחכה לתגובת הלקוח (48 שעות)</p>
        </div>

        <div className="p-8 border-t border-slate-100 flex gap-4">
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl disabled:opacity-50"
          >
            {sending ? 'שולח...' : 'שלח הצעת פשרה'}
          </button>
          <button onClick={onClose} className="px-8 py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl">בטל</button>
        </div>
      </div>
    </div>
  );
};

export default CompromiseModal;
