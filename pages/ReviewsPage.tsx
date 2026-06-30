import React, { useState, useEffect } from 'react';
import { AppState, Review, ReviewNotification, UserRole } from '../types';
import { translations, Language } from '../translations';
import { reviewsAPI, unitsAPI } from '../api';
import {
  Star, Trash2, Calendar, MessageSquare, Bell, Handshake
} from 'lucide-react';
import CompromiseModal from '../components/reviews/CompromiseModal';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

const STATUS_LABELS: Record<string, string> = {
  pending_owner: 'ממתין לטיפול',
  compromise_sent: 'מחכה לתגובת הלקוח',
  counter_sent: 'תגובה נגדית מהאורח',
  published: 'פורסם',
  withdrawn: 'בוטל',
};

const ReviewsPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isOwner = user?.role === UserRole.ZIMMER_OWNER ||
    user?.role === UserRole.COMPLEX_OWNER ||
    user?.role === UserRole.MANAGER;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [units, setUnits] = useState(db.units);
  const [notifications, setNotifications] = useState<ReviewNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [compromiseReview, setCompromiseReview] = useState<Review | null>(null);
  const [viewReview, setViewReview] = useState<Review | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reviewsData, unitsData, notifData] = await Promise.all([
        reviewsAPI.getAll(),
        unitsAPI.getAll().catch(() => []),
        reviewsAPI.getNotifications(),
      ]);
      setReviews(reviewsData || []);
      setUnits(unitsData || db.units);
      setNotifications(notifData || []);
      setDb({ ...db, reviews: reviewsData || [], units: unitsData || db.units });
    } catch (err: any) {
      console.error('Error loading reviews:', err);
      alert('שגיאה בטעינת ביקורות: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getUnitName = (id: string) => units.find(u => u.id === id)?.name || 'יחידה';

  const handleDelete = async (id: string) => {
    if (!confirm('מחק ביקורת זו?')) return;
    try {
      await reviewsAPI.delete(id);
      await loadData();
    } catch (err: any) {
      alert('שגיאה במחיקה: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSendCompromise = async (data: { type: string; customText: string }) => {
    if (!compromiseReview) return;
    await reviewsAPI.sendCompromise(compromiseReview.id, data);
    await loadData();
  };

  const pendingReviews = reviews.filter(r =>
    r.status === 'pending_owner' || r.status === 'counter_sent'
  );
  const otherReviews = reviews.filter(r =>
    r.status !== 'pending_owner' && r.status !== 'counter_sent'
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const canSendCompromise = (review: Review) =>
    (isOwner || isAdmin) &&
    (review.status === 'pending_owner' || review.status === 'counter_sent');

  return (
    <div className="space-y-8 animate-fadeIn text-right">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100">
              <Bell size={16} />
              <span className="text-xs font-black">{unreadCount} התראות</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
            <MessageSquare size={16} />
            <span className="text-xs font-black uppercase tracking-wider">ביקורות האורחים שלך</span>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.reviews}</h2>
          <p className="text-slate-500 font-medium">צפייה וטיפול בביקורות שהשאירו האורחים במתחם.</p>
        </div>
      </div>

      {notifications.filter(n => !n.read).length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
          {notifications.filter(n => !n.read).slice(0, 5).map(n => (
            <div key={n.id} className="flex items-center justify-between gap-3">
              <button
                onClick={async () => {
                  await reviewsAPI.markNotificationRead(n.id);
                  if (n.reviewId) {
                    const r = reviews.find(rv => rv.id === n.reviewId);
                    if (r) setViewReview(r);
                  }
                  loadData();
                }}
                className="text-xs font-bold text-amber-700 hover:underline shrink-0"
              >
                פתח בירור
              </button>
              <p className="text-sm text-slate-700 flex-1 text-right">{n.message}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold">טוען...</div>
      ) : (
        <>
          {pendingReviews.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest">דורש טיפול ({pendingReviews.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingReviews.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    unitName={getUnitName(review.unitId)}
                    isAdmin={isAdmin}
                    canCompromise={canSendCompromise(review)}
                    onCompromise={() => setCompromiseReview(review)}
                    onView={() => setViewReview(review)}
                    onDelete={() => handleDelete(review.id)}
                    highlight
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherReviews.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                unitName={getUnitName(review.unitId)}
                isAdmin={isAdmin}
                canCompromise={false}
                onView={() => setViewReview(review)}
                onDelete={() => handleDelete(review.id)}
              />
            ))}
            {reviews.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                <Star size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-slate-400 font-black">עדיין אין ביקורות להצגה עבור המתחם שלך.</p>
              </div>
            )}
          </div>
        </>
      )}

      {compromiseReview && (
        <CompromiseModal
          review={compromiseReview}
          unitName={getUnitName(compromiseReview.unitId)}
          onSend={handleSendCompromise}
          onClose={() => setCompromiseReview(null)}
        />
      )}

      {viewReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setViewReview(null)} />
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl z-10 p-8 space-y-5 text-right max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-slate-800">פרטי ביקורת</h3>
            <p className="text-xs font-bold text-indigo-500">{getUnitName(viewReview.unitId)}</p>
            <p className="font-black text-slate-800">{viewReview.guestName}</p>
            {viewReview.rating != null && (
              <div className="flex items-center gap-1 text-amber-500 justify-end">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < viewReview.rating! ? 'currentColor' : 'none'} />
                ))}
              </div>
            )}
            <p className="text-sm text-slate-600 italic">"{viewReview.comment}"</p>
            <p className="text-xs font-bold text-slate-400">{STATUS_LABELS[viewReview.status]}</p>
            {viewReview.guestResponse?.text && (
              <div className="bg-rose-50 p-3 rounded-xl">
                <p className="text-[10px] font-black text-rose-400 mb-1">תגובה נגדית</p>
                <p className="text-sm">{viewReview.guestResponse.text}</p>
              </div>
            )}
            {canSendCompromise(viewReview) && (
              <button
                onClick={() => { setCompromiseReview(viewReview); setViewReview(null); }}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2"
              >
                <Handshake size={18} />
                פתח בירור ישיר ופרטי
              </button>
            )}
            <button onClick={() => setViewReview(null)} className="w-full py-3 text-slate-500 font-bold">סגור</button>
          </div>
        </div>
      )}
    </div>
  );
};

interface CardProps {
  review: Review;
  unitName: string;
  isAdmin: boolean;
  canCompromise: boolean;
  highlight?: boolean;
  onCompromise?: () => void;
  onView: () => void;
  onDelete: () => void;
}

const ReviewCard: React.FC<CardProps> = ({
  review, unitName, isAdmin, canCompromise, highlight,
  onCompromise, onView, onDelete
}) => (
  <div className={`bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all relative ${
    highlight ? 'border-rose-200 ring-2 ring-rose-50' : 'border-slate-100'
  }`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-2">
        {isAdmin && (
          <button onClick={onDelete} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {review.rating != null ? (
        <div className="flex items-center gap-1 text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={14} fill={i < review.rating! ? 'currentColor' : 'none'} />
          ))}
        </div>
      ) : (
        <span className="text-[10px] font-bold text-slate-400">ללא דירוג</span>
      )}
    </div>

    <div className="space-y-4">
      <div className="text-right">
        <p className="font-black text-slate-800 leading-none">{review.guestName}</p>
        <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1 tracking-widest">{unitName}</p>
        <span className={`inline-block mt-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
          review.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {STATUS_LABELS[review.status]}
        </span>
      </div>
      <p className="text-sm text-slate-600 italic leading-relaxed">"{review.comment}"</p>

      {canCompromise && onCompromise && (
        <button
          onClick={onCompromise}
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <Handshake size={16} />
          פתח בירור ישיר ופרטי
        </button>
      )}

      <button onClick={onView} className="w-full text-xs font-bold text-indigo-500 hover:underline">
        צפייה בפרטי הביקורת
      </button>

      <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-slate-400 border-t border-slate-50 pt-3">
        <Calendar size={12} />
        {review.date}
      </div>
    </div>
  </div>
);

export default ReviewsPage;
