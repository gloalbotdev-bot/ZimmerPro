import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Review } from '../../types';

const COMPROMISE_LABELS: Record<string, string> = {
  discount_20: '20% הנחה לשהייה הבאה',
  credit_150: 'זיכוי 150 ש"ח במזומן',
  reasoned_response: 'תגובה מנומקת',
  custom: 'הצעה מותאמת אישית',
};

interface Props {
  review: Review;
  unitName: string;
  onRespond: (data: { action: 'accept' | 'reject' | 'counter'; counterText?: string }) => Promise<void>;
  onClose: () => void;
}

const GuestCompromiseResponse: React.FC<Props> = ({ review, unitName, onRespond, onClose }) => {
  const [counterText, setCounterText] = useState('');
  const [showCounter, setShowCounter] = useState(false);
  const [loading, setLoading] = useState(false);

  const offerLabel = review.compromiseOffer
    ? COMPROMISE_LABELS[review.compromiseOffer.type] || review.compromiseOffer.type
    : '';

  const handleAction = async (action: 'accept' | 'reject' | 'counter') => {
    if (action === 'counter' && !counterText.trim()) {
      setShowCounter(true);
      return;
    }
    try {
      setLoading(true);
      await onRespond({ action, counterText: action === 'counter' ? counterText.trim() : undefined });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl z-10 animate-scaleIn flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <X size={24} className="text-slate-400 cursor-pointer" onClick={onClose} />
          <h3 className="text-xl font-black text-slate-800">מענה להצעת פשרה</h3>
        </div>

        <div className="p-8 space-y-5 text-right">
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-500 uppercase mb-1">{unitName}</p>
            <p className="text-sm text-slate-600 italic">"{review.comment}"</p>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">הצעת בעל הצימר</p>
            <p className="text-sm font-bold text-slate-800">{offerLabel}</p>
            {review.compromiseOffer?.customText && (
              <p className="text-sm text-slate-600 mt-2">{review.compromiseOffer.customText}</p>
            )}
          </div>

          {showCounter && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">תגובה נגדית</label>
              <textarea
                value={counterText}
                onChange={e => setCounterText(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm h-24"
                placeholder="כתוב את תגובתך..."
              />
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 space-y-3">
          <button
            onClick={() => handleAction('accept')}
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl disabled:opacity-50"
          >
            קבל הצעה (ומחק ביקורת)
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={loading}
            className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 rounded-2xl disabled:opacity-50"
          >
            סרב להצעה (ופרסם ביקורת)
          </button>
          <button
            onClick={() => {
              if (!showCounter) {
                setShowCounter(true);
                return;
              }
              if (counterText.trim()) handleAction('counter');
            }}
            disabled={loading}
            className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 rounded-2xl disabled:opacity-50"
          >
            שלח תגובה נגדית
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestCompromiseResponse;
