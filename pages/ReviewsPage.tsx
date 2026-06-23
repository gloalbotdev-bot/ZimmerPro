
import { useState } from 'react';
import { AppState, Review, UserRole } from '../types';
import { translations, Language } from '../translations';
import { 
  Star, Plus, Trash2, Edit2, X, Calendar, MessageSquare, ShieldCheck
} from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

const ReviewsPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentReview, setCurrentReview] = useState<Partial<Review>>({
    guestName: '',
    rating: 5,
    comment: '',
    unitId: db.units[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    isPublished: true
  });

  const handleOpenAdd = () => {
    setCurrentReview({
      guestName: '',
      rating: 5,
      comment: '',
      unitId: db.units[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      isPublished: true
    });
    setModalMode('add');
    setShowModal(true);
  };

  const handleOpenEdit = (review: Review) => {
    setCurrentReview(review);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!currentReview.guestName || !currentReview.comment) return;

    if (modalMode === 'add') {
      const review: Review = {
        id: Math.random().toString(36).substr(2, 9),
        guestName: currentReview.guestName!,
        rating: currentReview.rating!,
        comment: currentReview.comment!,
        unitId: currentReview.unitId!,
        date: currentReview.date!,
        isPublished: !!currentReview.isPublished
      };
      setDb({ ...db, reviews: [review, ...db.reviews] });
    } else {
      const updatedReviews = db.reviews.map(r => r.id === currentReview.id ? { ...r, ...currentReview } as Review : r);
      setDb({ ...db, reviews: updatedReviews });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('מחק ביקורת זו?')) {
      setDb({ ...db, reviews: db.reviews.filter(r => r.id !== id) });
    }
  };

  const getUnitName = (id: string) => db.units.find(u => u.id === id)?.name || 'Unknown';

  const filteredReviews = db.reviews.filter(r => {
    const unit = db.units.find(u => u.id === r.unitId);
    return isAdmin || unit?.accountId === user?.accountId;
  });

  return (
    <div className="space-y-8 animate-fadeIn text-right">
      <div className="flex items-center justify-between">
        {isAdmin ? (
          <button 
            onClick={handleOpenAdd}
            className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Plus size={18} />
            {t.add_review}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
             <MessageSquare size={16} />
             <span className="text-xs font-black uppercase tracking-wider">ביקורות האורחים שלך</span>
          </div>
        )}
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.reviews}</h2>
          <p className="text-slate-500 font-medium">כאן ניתן לצפות בחוות הדעת שהשאירו האורחים במתחם.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReviews.map(review => (
          <div key={review.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            {review.rating === 5 && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full flex items-center justify-center pt-2 pr-2 text-amber-500">
                <Star size={16} fill="currentColor" />
              </div>
            )}
            
            <div className="flex items-center justify-between mb-4">
               <div className="flex gap-2">
                  {isAdmin && (
                    <>
                      <button onClick={() => handleOpenEdit(review)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(review.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                    </>
                  )}
               </div>
               <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} />
                  ))}
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-end gap-3">
                  <div className="text-right">
                     <p className="font-black text-slate-800 leading-none">{review.guestName}</p>
                     <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1 tracking-widest">{getUnitName(review.unitId)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black border border-slate-200">
                    {review.guestName.charAt(0)}
                  </div>
               </div>
               <p className="text-sm text-slate-600 italic leading-relaxed text-right">"{review.comment}"</p>
               <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-slate-400 border-t border-slate-50 pt-3">
                  <Calendar size={12} />
                  {review.date}
               </div>
            </div>
          </div>
        ))}
        {filteredReviews.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
            <Star size={48} className="mx-auto text-slate-100 mb-4" />
            <p className="text-slate-400 font-black">עדיין אין ביקורות להצגה עבור המתחם שלך.</p>
          </div>
        )}
      </div>

      {showModal && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-scaleIn flex flex-col">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <X size={24} className="text-slate-400 cursor-pointer" onClick={() => setShowModal(false)} />
              <h3 className="text-xl font-black text-slate-800">{modalMode === 'add' ? t.add_review : 'עריכת ביקורת'}</h3>
            </div>
            <div className="p-8 space-y-5">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">בחר יחידה</label>
                  <select 
                    value={currentReview.unitId}
                    onChange={e => setCurrentReview({...currentReview, unitId: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                  >
                    {db.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">תאריך</label>
                    <input type="date" value={currentReview.date} onChange={e => setCurrentReview({...currentReview, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">שם האורח</label>
                    <input type="text" value={currentReview.guestName} onChange={e => setCurrentReview({...currentReview, guestName: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold" />
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">דירוג</label>
                  <div className="flex gap-2 justify-center py-2 bg-slate-50 rounded-2xl">
                     {[1,2,3,4,5].map(num => (
                       <button 
                        key={num} 
                        onClick={() => setCurrentReview({...currentReview, rating: num})}
                        className={`p-2 transition-all ${currentReview.rating === num ? 'text-amber-500 scale-125' : 'text-slate-300'}`}
                       >
                         <Star size={24} fill={currentReview.rating! >= num ? 'currentColor' : 'none'} />
                       </button>
                     ))}
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 mr-1 tracking-widest">ביקורת</label>
                  <textarea 
                    value={currentReview.comment}
                    onChange={e => setCurrentReview({...currentReview, comment: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm h-32"
                    placeholder="איך היה האירוח?"
                  />
               </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
              <button onClick={handleSave} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200">{t.save}</button>
              <button onClick={() => setShowModal(false)} className="px-10 py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
