
import React from 'react';
import { AppState, UserRole } from '../types';
import { translations, Language } from '../translations';
import { 
  Users, 
  TrendingUp, 
  CalendarCheck, 
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface Props {
  db: AppState;
  lang: Language;
}

const Dashboard: React.FC<Props> = ({ db, lang }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;

  const calculateMonthlyIncome = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalIncome = 0;
    let monthlyBookings = 0;
    
    for (const booking of db.bookings) {
      try {
        const checkInDate = new Date(booking.checkIn);
        if (checkInDate.getMonth() === currentMonth && checkInDate.getFullYear() === currentYear) {
          const unit = db.units.find(u => u.id === booking.unitId);
          if (!unit) continue;
          
          if (isAdmin || unit.accountId === user?.accountId || (user?.role === 'zimmer_owner' && unit.userId === user?._id)) {
            totalIncome += booking.totalPrice || 0;
            monthlyBookings += 1;
          }
        }
      } catch (e) {
        console.error('Error parsing booking date:', booking.checkIn);
      }
    }
    
    return { income: totalIncome, bookingCount: monthlyBookings };
  };

  const { income: monthlyIncome, bookingCount } = calculateMonthlyIncome();
  
  // Count confirmed/completed bookings for current month
  const currentMonthBookings = db.bookings.filter(b => {
    try {
      const checkInDate = new Date(b.checkIn);
      const now = new Date();
      const isCurrentMonth = checkInDate.getMonth() === now.getMonth() && checkInDate.getFullYear() === now.getFullYear();
      
      if (!isCurrentMonth) return false;
      
      const unit = db.units.find(u => u.id === b.unitId);
      if (!unit) return false;
      
      return isAdmin || unit.accountId === user?.accountId || (user?.role === 'zimmer_owner' && unit.userId === user?._id);
    } catch (e) {
      return false;
    }
  }).length;

  const stats = [
    { label: t.monthly_income, value: `₪${monthlyIncome.toLocaleString('he-IL')}`, change: `+${bookingCount}`, icon: CircleDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t.new_bookings, value: currentMonthBookings, change: '+3', icon: CalendarCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: t.active_guests, value: '4', change: '-2', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: t.avg_occupancy, value: '78%', change: '+5.2%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const chartData = lang === 'en' 
    ? [ { name: 'Sun', value: 400 }, { name: 'Mon', value: 300 }, { name: 'Tue', value: 600 }, { name: 'Wed', value: 800 }, { name: 'Thu', value: 500 }, { name: 'Fri', value: 900 }, { name: 'Sat', value: 1100 } ]
    : [ { name: 'א׳', value: 400 }, { name: 'ב׳', value: 300 }, { name: 'ג׳', value: 600 }, { name: 'ד׳', value: 800 }, { name: 'ה׳', value: 500 }, { name: 'ו׳', value: 900 }, { name: 'ש׳', value: 1100 } ];

  // Filter reviews for current owner context
  const filteredReviews = db.reviews.filter(r => {
    const unit = db.units.find(u => u.id === r.unitId);
    return isAdmin || unit?.accountId === user?.accountId;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {user?.name ? `שלום, ${user.name}` : t.welcome}
          </h2>
          <p className="text-slate-500 text-sm">סיכום פעילות</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-right">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${s.bg} ${s.color}`}>
                <s.icon size={24} />
              </div>
              <div className={`flex items-center text-xs font-bold ${s.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                {s.change.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {s.change}
              </div>
            </div>
            <p className="text-slate-500 text-sm font-bold mb-1">{s.label}</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              ביצועים שבועיים
            </h4>
          </div>
          <div className="h-72 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} orientation={t.dir === 'rtl' ? 'right' : 'left'} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" />
              {t.recent_activity}
            </h4>
            <div className="space-y-6">
              {db.bookings.slice(0, 3).map((b, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                    {b.guestName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-none mb-1">{b.guestName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">הזמין את {db.units.find(u => u.id === b.unitId)?.name || 'יחידה'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Star size={18} className="text-amber-500" />
              ביקורות אחרונות
            </h4>
            <div className="space-y-6">
              {filteredReviews.slice(0, 3).map((r, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    {r.rating != null ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} size={10} fill={idx < r.rating! ? 'currentColor' : 'none'} />
                      ))
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">ללא דירוג</span>
                    )}
                  </div>
                  <p className="text-xs font-black text-slate-800">{r.guestName}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-1 italic">"{r.comment}"</p>
                </div>
              ))}
              {filteredReviews.length === 0 && (
                 <p className="text-xs text-slate-300 font-bold">עדיין אין ביקורות משויכות.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
