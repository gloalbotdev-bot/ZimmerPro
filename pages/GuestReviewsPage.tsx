import React, { useState, useEffect } from 'react';
import { AppState, Review, ReviewNotification, ZimmerUnit } from '../types';
import { translations, Language } from '../translations';
import { reviewsAPI } from '../api';
import { Star, Plus, Calendar, Bell, MessageSquare } from 'lucide-react';
import GuestReviewForm from '../components/reviews/GuestReviewForm';
import GuestCompromiseResponse from '../components/reviews/GuestCompromiseResponse';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

const STATUS_LABELS: Record<string, string> = {
  pending_owner: 'ממתין לבעל הצימר',
  compromise_sent: 'הצעת פשרה — נדרשת תגובתך',
  counter_sent: 'תגובה נגדית נשלחה',
  published: 'פורסם',
  withdrawn: 'בוטל',
};

const GuestReviewsPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const user = db.currentUser!;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibleUnits, setEligibleUnits] = useState<ZimmerUnit[]>([]);
  const [notifications, setNotifications] = useState<ReviewNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [respondingReview, setRespondingReview] = useState<Review | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      let reviewsData: Review[] = [];
      let unitsData: ZimmerUnit[] = [];
      let notifData: ReviewNotification[] = [];

      try {
        reviewsData = await reviewsAPI.getAll() || [];
      } catch (err: any) {
        console.error('Error loading reviews:', err);
      }

      try {
        unitsData = await reviewsAPI.getEligibleUnits() || [];
      } catch (err: any) {
        console.error('Error loading eligible units:', err);
        if (!err.message?.includes('roles')) {
          alert('שגיאה בטעינת יחידות זכאיות: ' + (err.message || 'Unknown error'));
        }
      }

      try {
        notifData = await reviewsAPI.getNotifications() || [];
      } catch (err: any) {
        console.error('Error loading notifications:', err);
      }

      setReviews(reviewsData);
      setEligibleUnits(unitsData);
      setNotifications(notifData);
      setDb({ ...db, reviews: reviewsData });
    } catch (err: any) {
      console.error('Error loading guest reviews:', err);
      alert('שגיאה בטעינת ביקורות: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getUnitName = (id: string) => eligibleUnits.find(u => u.id === id)?.name || 'יחידה';

  const handleCreate = async (data: { unitId: string; rating: number | null; comment: string; date: string }) => {
    await reviewsAPI.create(data);
    await loadData();
  };

  const handleRespond = async (reviewId: string, data: { action: string; counterText?: string }) => {
    await reviewsAPI.respondToCompromise(reviewId, data);
    await loadData();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-8 animate-fadeIn text-right">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Plus size={18} />
            {t.add_review}
          </button>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100">
              <Bell size={16} />
              <span className="text-xs font-black">{unreadCount} התראות חדשות</span>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.reviews}</h2>
          <p className="text-slate-500 font-medium">שתף את חוויית האירוח שלך — הביקורת תעבור בירור לפני פרסום.</p>
        </div>
      </div>

      {notifications.filter(n => !n.read).length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
          {notifications.filter(n => !n.read).slice(0, 3).map(n => (
            <div key={n.id} className="flex items-center justify-between gap-3">
              <button
                onClick={async () => {
                  await reviewsAPI.markNotificationRead(n.id);
                  if (n.reviewId) {
                    const r = reviews.find(rv => rv.id === n.reviewId);
                    if (r?.status === 'compromise_sent') setRespondingReview(r);
                  }
                  loadData();
                }}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                פתח
              </button>
              <p className="text-sm text-slate-700 flex-1 text-right">{n.message}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold">טוען...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map(review => (
            <div key={review.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                  review.status === 'compromise_sent' ? 'bg-amber-100 text-amber-700' :
                  review.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                  review.status === 'withdrawn' ? 'bg-slate-100 text-slate-500' :
                  'bg-indigo-100 text-indigo-700'
                }`}>
                  {STATUS_LABELS[review.status] || review.status}
                </span>
                {review.rating != null && (
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} fill={i < review.rating! ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="text-right">
                  <p className="font-black text-slate-800">{getUnitName(review.unitId)}</p>
                  <p className="text-sm text-slate-600 italic mt-2">"{review.comment}"</p>
                </div>

                {review.status === 'compromise_sent' && (
                  <button
                    onClick={() => setRespondingReview(review)}
                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-sm"
                  >
                    הגב להצעת הפשרה
                  </button>
                )}

                <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-slate-400 border-t border-slate-50 pt-3">
                  <Calendar size={12} />
                  {review.date}
                </div>
              </div>
            </div>
          ))}

          {reviews.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
              <MessageSquare size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-slate-400 font-black">עדיין לא כתבת ביקורות.</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <GuestReviewForm
          eligibleUnits={eligibleUnits}
          guestName={user.name}
          lang={lang}
          onSave={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      {respondingReview && (
        <GuestCompromiseResponse
          review={respondingReview}
          unitName={getUnitName(respondingReview.unitId)}
          onRespond={data => handleRespond(respondingReview.id, data)}
          onClose={() => setRespondingReview(null)}
        />
      )}
    </div>
  );
};

export default GuestReviewsPage;
