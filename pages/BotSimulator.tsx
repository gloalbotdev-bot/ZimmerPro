
import React, { useEffect } from 'react';
import { AppState } from '../types';
import { Language } from '../translations';
import { MessageSquare } from 'lucide-react';
import { unitsAPI, bookingsAPI } from '../api';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

const BotSimulator: React.FC<Props> = ({ db, setDb }) => {
  useEffect(() => {
    const loadData = async () => {
      try {
        const [unitsData, bookingsData] = await Promise.all([
          unitsAPI.getAll(),
          bookingsAPI.getAll()
        ]);
        setDb({ ...db, units: unitsData || [], bookings: bookingsData || [] });
      } catch (err) {
        console.error('Error loading data for bot:', err);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">בוט WhatsApp</h2>
        <p className="text-slate-500 text-sm mt-1">הזמנות אוטומטיות דרך וואטסאפ</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <MessageSquare size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600 font-medium">הבוט עדיין לא מחובר</p>
        <p className="text-slate-400 text-sm mt-1">הגדרה בעמוד אינטגרציות</p>
      </div>
    </div>
  );
};

export default BotSimulator;
