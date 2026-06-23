
import React, { useState, useEffect } from 'react';
import { AppState, UserRole, ZimmerUnit, Booking, BookingStatus, User } from '../types';
import { translations, Language } from '../translations';
import { unitsAPI, bookingsAPI, usersAPI } from '../api';
import { ChevronLeft, ChevronRight, Star, Sun, Moon, X, Calendar as CalendarIcon, Edit2, Save, User as UserIcon, Phone, DollarSign, Clock, MapPin } from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

// Get calendar days for a specific month and year
const getCalendarDays = (month: number, year: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Adjust for Hebrew calendar (Sunday = 0, but we want it to be first day)
  const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1; // Monday = 0
  
  const days: Array<{ day: number; date: Date; isCurrentMonth: boolean }> = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < adjustedStartingDay; i++) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    const date = new Date(prevYear, prevMonth, daysInPrevMonth - adjustedStartingDay + i + 1);
    days.push({ day: date.getDate(), date, isCurrentMonth: false });
  }
  
  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({ day, date, isCurrentMonth: true });
  }
  
  // Fill remaining cells to complete the grid (6 rows * 7 days = 42 cells)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const date = new Date(nextYear, nextMonth, i);
    days.push({ day: i, date, isCurrentMonth: false });
  }
  
  return days;
};

// Check if date is today
const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

// Check if date is Shabbat (Saturday)
const isShabbat = (date: Date): boolean => {
  return date.getDay() === 6; // Saturday
};

// Format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get Hebrew day name
const getHebrewDayName = (date: Date): string => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[date.getDay()];
};

// Get Hebrew month name
const getHebrewMonthName = (date: Date): string => {
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  return months[date.getMonth()];
};

// Get Hebrew date for month header (simplified - shows first day of month)
const getHebrewDateForMonth = (month: number, year: number): string => {
  const firstDay = new Date(year, month, 1);
  const dayName = getHebrewDayName(firstDay);
  const day = firstDay.getDate();
  const monthName = getHebrewMonthName(firstDay);
  return `${dayName}, ${day} ב${monthName} ${year}`;
};

// Format date in Hebrew format (full)
const formatHebrewDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const dayName = getHebrewDayName(date);
  const day = date.getDate();
  const month = getHebrewMonthName(date);
  const year = date.getFullYear();
  return `${dayName}, ${day} ב${month} ${year}`;
};

// Format date in Hebrew format (short - for calendar cells)
const formatHebrewDateShort = (date: Date): string => {
  const dayName = getHebrewDayName(date);
  return dayName.charAt(0); // Just first letter of day name
};

// Check for Israeli holidays (simplified version)
const getHoliday = (dateStr: string): string | null => {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const holidays: Record<string, string> = {
    '01-01': 'ראש השנה האזרחית',
    '04-22': 'יום הזיכרון לשואה ולגבורה',
    '04-23': 'יום הזיכרון לחללי מערכות ישראל',
    '04-24': 'יום העצמאות',
    '05-14': 'יום ירושלים',
    '09-01': 'ראש השנה',
    '09-10': 'יום כיפור',
    '09-15': 'סוכות',
    '09-22': 'שמיני עצרת',
    '09-23': 'שמחת תורה',
    '12-18': 'חנוכה',
    '12-25': 'חנוכה',
  };
  
  const key = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return holidays[key] || null;
};

const CalendarPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [units, setUnits] = useState<ZimmerUnit[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  // Current date state
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentBooking, setCurrentBooking] = useState<Partial<Booking>>({
    unitId: '',
    guestName: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    totalPrice: 0,
    status: BookingStatus.PENDING
  });

  // Load units and bookings from API on mount
  useEffect(() => {
    loadUnits();
    loadBookings();
    if (isAdmin) {
      loadUsers();
    }
  }, []);

  const loadUnits = async () => {
    try {
      setLoading(true);
      console.log('📅 [CalendarPage] Loading units from API...');
      const data = await unitsAPI.getAll();
      console.log('📅 [CalendarPage] Units loaded:', data?.length || 0);
      setUnits(data || []);
      // Also update local db for compatibility
      setDb({ ...db, units: data || [] });
    } catch (err: any) {
      console.error('❌ [CalendarPage] Error loading units:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      console.log('📅 [CalendarPage] Loading bookings from API...');
      const data = await bookingsAPI.getAll();
      console.log('📅 [CalendarPage] Bookings loaded:', data?.length || 0);
      setBookings(data || []);
      // Also update local db for compatibility
      setDb({ ...db, bookings: data || [] });
    } catch (err: any) {
      console.error('❌ [CalendarPage] Error loading bookings:', err);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('📅 [CalendarPage] Loading users from API...');
      const data = await usersAPI.getAll();
      console.log('📅 [CalendarPage] Users loaded:', data?.length || 0);
      setUsers(data || []);
    } catch (err: any) {
      console.error('❌ [CalendarPage] Error loading users:', err);
    }
  };
  
  // Get calendar days for current month
  const calendarDays = getCalendarDays(currentMonth, currentYear);
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const dayNames = ['ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\'', 'א\''];
  
  // Client/customer users don't need units - they only see their bookings
  const displayedUnits = (user?.role === UserRole.CLIENT || user?.role === UserRole.CUSTOMER)
    ? []
    : isAdmin 
    ? units 
    : user?.role === UserRole.ZIMMER_OWNER && !user?.accountId
    ? units.filter(u => {
        // zimmer_owner without account: filter by userId
        const unitUserId = u.userId?.toString();
        const currentUserId = user._id?.toString() || user.id?.toString();
        return unitUserId === currentUserId;
      })
    : units.filter(u => Number(u.accountId) === Number(user?.accountId));

  // Navigation functions
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Get available units based on selected user (for admin) or current user
  const getAvailableUnits = (): ZimmerUnit[] => {
    if (isAdmin && selectedUserId) {
      const selectedUser = users.find(u => u.id === selectedUserId);
      if (selectedUser) {
        // For admin selecting a user
        if (selectedUser.role === UserRole.ZIMMER_OWNER && !selectedUser.accountId) {
          // zimmer_owner without account: filter by userId
          return units.filter(u => {
            const unitUserId = u.userId?.toString();
            const currentUserId = selectedUser._id?.toString() || selectedUser.id?.toString();
            return unitUserId === currentUserId;
          });
        } else {
          // complex_owner/manager or zimmer_owner with account: filter by accountId
          return units.filter(u => Number(u.accountId) === Number(selectedUser.accountId));
        }
      }
      return [];
    }
    return displayedUnits;
  };

  const handleDayClick = (date: Date, unitId?: string) => {
    const checkInDate = formatDate(date);
    setSelectedDay(date.getDate());
    setCurrentBooking({
      unitId: unitId || '',
      guestName: '',
      guestPhone: '',
      checkIn: checkInDate,
      checkOut: '',
      totalPrice: 0,
      status: BookingStatus.PENDING
    });
    setShowBookingModal(true);
  };

  const handleBookingClick = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBooking(booking);
    setIsEditingBooking(false);
    setShowBookingDetailsModal(true);
  };

  const handleUpdateBooking = async () => {
    if (!selectedBooking) return;

    try {
      setLoading(true);
      await bookingsAPI.update(selectedBooking.id, selectedBooking);
      await loadBookings();
      setIsEditingBooking(false);
    } catch (err: any) {
      console.error('❌ [CalendarPage] Error updating booking:', err);
      alert('שגיאה בעדכון ההזמנה: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBooking = async () => {
    console.log('📅 [CalendarPage] Saving booking:', currentBooking);
    console.log('📅 [CalendarPage] Selected user ID:', selectedUserId);
    console.log('📅 [CalendarPage] Available units:', getAvailableUnits().length);
    
    // Validate required fields
    if (isAdmin && !selectedUserId) {
      alert('אנא בחר משתמש');
      return;
    }
    if (!currentBooking.unitId) {
      alert('אנא בחר יחידה');
      return;
    }
    if (!currentBooking.guestName || currentBooking.guestName.trim() === '') {
      alert('אנא הזן שם אורח');
      return;
    }
    if (!currentBooking.guestPhone || currentBooking.guestPhone.trim() === '') {
      alert('אנא הזן טלפון אורח');
      return;
    }
    if (!currentBooking.checkIn) {
      alert('אנא בחר תאריך כניסה');
      return;
    }
    if (!currentBooking.checkOut) {
      alert('אנא בחר תאריך יציאה');
      return;
    }
    if (currentBooking.totalPrice === undefined || currentBooking.totalPrice === null || currentBooking.totalPrice < 0) {
      alert('אנא הזן מחיר כולל תקין');
      return;
    }

    try {
      setLoading(true);
      await bookingsAPI.create(currentBooking);
      await loadBookings();
      setShowBookingModal(false);
      setSelectedDay(null);
      setSelectedUserId('');
    } catch (err: any) {
      console.error('❌ [CalendarPage] Error creating booking:', err);
      alert('שגיאה ביצירת ההזמנה: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!currentBooking.unitId || !currentBooking.checkIn || !currentBooking.checkOut) return 0;
    const unit = units.find(u => u.id === currentBooking.unitId);
    if (!unit) return 0;
    
    const checkIn = new Date(currentBooking.checkIn);
    const checkOut = new Date(currentBooking.checkOut);
    
    // Calculate number of nights
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;
    
    let totalPrice = 0;
    const basePrice = unit.pricePerNight || 0;
    
    // Check each night and apply special prices if applicable
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkIn);
      currentDate.setDate(checkIn.getDate() + i);
      // Normalize to YYYY-MM-DD format (avoid timezone issues)
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Find if there's a special price for this date
      let priceForNight = basePrice;
      if (unit.specialPrices && unit.specialPrices.length > 0) {
        for (const specialPrice of unit.specialPrices) {
          if (specialPrice.startDate && specialPrice.endDate) {
            // Compare dates as strings (YYYY-MM-DD format)
            if (dateStr >= specialPrice.startDate && dateStr <= specialPrice.endDate) {
              priceForNight = specialPrice.pricePerNight || basePrice;
              break; // Use first matching special price
            }
          }
        }
      }
      
      totalPrice += priceForNight;
    }
    
    return totalPrice;
  };

  useEffect(() => {
    if (currentBooking.unitId && currentBooking.checkIn && currentBooking.checkOut) {
      const total = calculateTotalPrice();
      setCurrentBooking(prev => ({ ...prev, totalPrice: total }));
    }
  }, [currentBooking.unitId, currentBooking.checkIn, currentBooking.checkOut, units]);

  // Update available units when selected user changes (for admin)
  useEffect(() => {
    if (isAdmin && selectedUserId) {
      setCurrentBooking(prev => ({ ...prev, unitId: '' }));
    }
  }, [selectedUserId]);

  return (
    <div className="space-y-8 animate-fadeIn h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.calendar}</h2>
          <p className="text-slate-500 font-medium">
            תצוגת תפוסה כולל לוח עברי וחגים.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={goToToday}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2"
          >
            <CalendarIcon size={16} />
            היום
          </button>
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <button 
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-all"
            >
              {t.dir === 'rtl' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            <div className="min-w-[200px] text-center">
              <div className="font-black text-slate-800 text-lg">
                {monthNames[currentMonth]} {currentYear}
              </div>
              <div className="text-xs text-slate-500 font-bold mt-0.5">
                {getHebrewDateForMonth(currentMonth, currentYear)}
              </div>
            </div>
            <button 
              onClick={goToNextMonth}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-all"
            >
              {t.dir === 'rtl' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Calendar Header - Day Names */}
        <div className="flex border-b border-slate-100 bg-slate-50/30">
          <div className={`w-48 p-4 ${t.dir === 'rtl' ? 'border-l' : 'border-r'} border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0 flex items-center`}>
            {t.unit}
          </div>
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-[420px]">
              {dayNames.map((dayName, idx) => (
                <div 
                  key={idx}
                  className={`flex-1 min-w-[60px] p-2 text-center border-l border-slate-50 text-[10px] font-black text-slate-500 uppercase ${idx === 5 ? 'bg-indigo-50/50 text-indigo-600' : ''}`}
                >
                  {dayName}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Calendar dates header - all weeks */}
        <div className="flex border-b border-slate-100 bg-slate-50/20">
          <div className={`w-48 ${t.dir === 'rtl' ? 'border-l' : 'border-r'} border-slate-100 shrink-0`}></div>
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-[420px]">
              {Array.from({ length: 6 }).map((_, weekIdx) => (
                <div key={weekIdx} className="flex">
                  {calendarDays.slice(weekIdx * 7, (weekIdx + 1) * 7).map((dayInfo, dayIdx) => {
                    const today = isToday(dayInfo.date);
                    const shabbat = isShabbat(dayInfo.date);
                    return (
                      <div 
                        key={dayIdx}
                        onClick={() => handleDayClick(dayInfo.date)}
                        className={`flex-1 min-w-[60px] p-2 text-center border-l border-slate-50 flex flex-col justify-center transition-all cursor-pointer hover:bg-blue-50/50 ${
                          !dayInfo.isCurrentMonth ? 'opacity-30' : ''
                        } ${shabbat ? 'bg-indigo-50/50' : ''} ${today ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                      >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`text-[13px] font-black ${shabbat ? 'text-indigo-600' : today ? 'text-blue-700' : 'text-slate-700'}`}>
                      {dayInfo.day}
                    </span>
                    {dayInfo.isCurrentMonth && (
                      <span className="text-[9px] font-bold text-slate-400 leading-tight">
                        {getHebrewDayName(dayInfo.date)}
                      </span>
                    )}
                    {today && (
                      <span className="text-[8px] font-black text-blue-600 mt-0.5 leading-none">היום</span>
                    )}
                  </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {displayedUnits.map(unit => (
            <div key={unit.id} className="flex border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
              <div className={`w-48 p-4 ${t.dir === 'rtl' ? 'border-l' : 'border-r'} border-slate-100 shrink-0 bg-white group-hover:bg-slate-50/50 transition-colors`}>
                <p className="text-sm font-black text-slate-800 leading-tight">{unit.name}</p>
                <p className="text-[10px] text-indigo-500 font-bold">₪{unit.pricePerNight}/לילה</p>
                {unit.region && (
                  <p className="text-[9px] text-slate-400 font-bold mt-1">{unit.region}</p>
                )}
              </div>
              <div className="flex-1 overflow-x-auto relative min-h-[80px]">
                <div className="flex min-w-[420px] h-full">
                  {/* Render 6 weeks (42 days) */}
                  {Array.from({ length: 6 }).map((_, weekIdx) => (
                    <div key={weekIdx} className="flex">
                      {calendarDays.slice(weekIdx * 7, (weekIdx + 1) * 7).map((dayInfo, dayIdx) => {
                        const today = isToday(dayInfo.date);
                        const shabbat = isShabbat(dayInfo.date);
                        const dateStr = formatDate(dayInfo.date);
                        
                        // Check if there's a booking for this date
                        const hasBooking = bookings.some(b => {
                          if (b.unitId !== unit.id) return false;
                          const checkIn = new Date(b.checkIn);
                          const checkOut = new Date(b.checkOut);
                          const current = new Date(dayInfo.date);
                          return current >= checkIn && current < checkOut;
                        });
                        
                        return (
                          <div 
                            key={dayIdx}
                            onClick={() => handleDayClick(dayInfo.date, unit.id)}
                            className={`flex-1 min-w-[60px] border-l border-slate-50/50 h-full cursor-pointer hover:bg-blue-50/30 transition-all relative ${
                              !dayInfo.isCurrentMonth ? 'opacity-20' : ''
                            } ${shabbat ? 'bg-indigo-50/20' : ''} ${today ? 'ring-1 ring-blue-400' : ''} ${hasBooking ? 'bg-slate-100/50' : ''}`}
                          >
                            {today && (
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto mt-1"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                
                {/* Render bookings */}
                {bookings.filter(b => {
                  if (b.unitId !== unit.id) return false;
                  const checkInDate = new Date(b.checkIn + 'T00:00:00');
                  const checkOutDate = new Date(b.checkOut + 'T00:00:00');
                  // Check if booking overlaps with current month
                  const monthStart = new Date(currentYear, currentMonth, 1);
                  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
                  return checkInDate <= monthEnd && checkOutDate >= monthStart;
                }).map(b => {
                  const checkInDate = new Date(b.checkIn + 'T00:00:00');
                  const checkOutDate = new Date(b.checkOut + 'T00:00:00');
                  
                  // Find start and end positions in calendar
                  let startIdx = -1;
                  let endIdx = -1;
                  
                  calendarDays.forEach((d, idx) => {
                    const dateStr = formatDate(d.date);
                    const dayDate = new Date(dateStr + 'T00:00:00');
                    
                    if (startIdx === -1 && dayDate >= checkInDate) {
                      startIdx = idx;
                    }
                    if (dayDate < checkOutDate) {
                      endIdx = idx;
                    }
                  });
                  
                  if (startIdx === -1) return null;
                  if (endIdx === -1) endIdx = calendarDays.length - 1;
                  
                  const width = Math.max(60, (endIdx - startIdx + 1) * 60);
                  const leftPos = startIdx * 60;
                  
                  return (
                    <div 
                      key={b.id}
                      onClick={(e) => handleBookingClick(b, e)}
                      className="absolute top-2 h-12 bg-gradient-to-r from-slate-800 to-slate-700 text-white border border-slate-600 rounded-xl px-3 flex items-center overflow-hidden cursor-pointer hover:from-indigo-600 hover:to-indigo-500 hover:border-indigo-400 transition-all shadow-lg z-10"
                      style={{ 
                        width: `${width}px`, 
                        [t.dir === 'rtl' ? 'right' : 'left']: `${leftPos}px` 
                      }}
                      title={`${b.guestName} - ${b.checkIn} עד ${b.checkOut} | ₪${b.totalPrice} - לחץ לפרטים`}
                    >
                      <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px] text-white font-black border border-white/30 flex-shrink-0">
                          {b.guestName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black leading-none truncate">{b.guestName}</p>
                          <p className="text-[8px] font-bold opacity-70 truncate">
                            {b.checkIn.split('-')[2]}/{b.checkIn.split('-')[1]} - {b.checkOut.split('-')[2]}/{b.checkOut.split('-')[1]}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {displayedUnits.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-bold">
              אין יחידות להצגה ביומן.
            </div>
          )}
        </div>
      </div>

      {/* Booking Creation Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-slate-800">צור הזמנה חדשה</h3>
                <button onClick={() => { setShowBookingModal(false); setSelectedDay(null); setSelectedUserId(''); }} className="p-2 text-slate-400 hover:text-slate-900">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {isAdmin && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">בחר משתמש</label>
                    <select
                      value={selectedUserId}
                      onChange={e => setSelectedUserId(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                    >
                      <option value="">בחר משתמש</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email}) - {u.role}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">יחידה</label>
                  <select
                    value={currentBooking.unitId}
                    onChange={e => setCurrentBooking({ ...currentBooking, unitId: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                    disabled={isAdmin && !selectedUserId}
                  >
                    <option value="">בחר יחידה</option>
                    {getAvailableUnits().map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name} - ₪{unit.pricePerNight}/לילה</option>
                    ))}
                  </select>
                  {isAdmin && !selectedUserId && (
                    <p className="text-xs text-amber-600 mt-1 mr-2">⚠️ אנא בחר משתמש תחילה</p>
                  )}
                  {!isAdmin && getAvailableUnits().length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 mr-2">⚠️ אין יחידות זמינות</p>
                  )}
                  {isAdmin && selectedUserId && getAvailableUnits().length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 mr-2">⚠️ למשתמש שנבחר אין יחידות</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">שם אורח</label>
                    <input
                      type="text"
                      value={currentBooking.guestName}
                      onChange={e => setCurrentBooking({ ...currentBooking, guestName: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                      placeholder="ישראל ישראלי"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">טלפון אורח</label>
                    <input
                      type="tel"
                      value={currentBooking.guestPhone}
                      onChange={e => setCurrentBooking({ ...currentBooking, guestPhone: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                      placeholder="050-1234567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תאריך כניסה</label>
                    <input
                      type="date"
                      value={currentBooking.checkIn}
                      onChange={e => setCurrentBooking({ ...currentBooking, checkIn: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תאריך יציאה</label>
                    <input
                      type="date"
                      value={currentBooking.checkOut}
                      onChange={e => setCurrentBooking({ ...currentBooking, checkOut: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סה"כ מחיר</label>
                  <input
                    type="number"
                    value={currentBooking.totalPrice}
                    onChange={e => setCurrentBooking({ ...currentBooking, totalPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                    placeholder="0"
                    min="0"
                    readOnly
                  />
                  {currentBooking.unitId && currentBooking.checkIn && currentBooking.checkOut && (() => {
                    const unit = units.find(u => u.id === currentBooking.unitId);
                    return (
                      <p className="text-xs text-slate-400 mt-1 mr-2">
                        מחיר מחושב אוטומטית לפי הלילות {unit?.specialPrices && unit.specialPrices.length > 0 && '(כולל מחירים מיוחדים)'}
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סטטוס</label>
                  <select
                    value={currentBooking.status}
                    onChange={e => setCurrentBooking({ ...currentBooking, status: e.target.value as BookingStatus })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                  >
                    <option value={BookingStatus.PENDING}>Pending</option>
                    <option value={BookingStatus.CONFIRMED}>Confirmed</option>
                    <option value={BookingStatus.CANCELLED}>Cancelled</option>
                    <option value={BookingStatus.COMPLETED}>Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleSaveBooking}
                  disabled={loading || (isAdmin && !selectedUserId)}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                >
                  {loading ? 'שומר...' : 'שמור הזמנה'}
                </button>
                <button
                  onClick={() => { setShowBookingModal(false); setSelectedDay(null); setSelectedUserId(''); }}
                  className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">פרטי הזמנה</h3>
                  <p className="text-sm text-slate-500 mt-1">ID: {selectedBooking.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingBooking && (
                    <button 
                      onClick={() => setIsEditingBooking(true)}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                      title="ערוך"
                    >
                      <Edit2 size={20} />
                    </button>
                  )}
                  <button 
                    onClick={() => { setShowBookingDetailsModal(false); setSelectedBooking(null); setIsEditingBooking(false); }} 
                    className="p-2 text-slate-400 hover:text-slate-900"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {!isEditingBooking ? (
                // View Mode
                <div className="space-y-6">
                  {/* Guest Info */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black shadow-lg">
                        {selectedBooking.guestName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-800">{selectedBooking.guestName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-600 font-bold">{selectedBooking.guestPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                          <CalendarIcon size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">תאריך כניסה</p>
                          <p className="text-lg font-black text-slate-800 mt-1">{selectedBooking.checkIn}</p>
                          <p className="text-sm text-blue-600 font-bold mt-1">{formatHebrewDate(selectedBooking.checkIn)}</p>
                          {getHoliday(selectedBooking.checkIn) && (
                            <p className="text-xs text-rose-600 font-black mt-1">🎉 {getHoliday(selectedBooking.checkIn)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                          <Clock size={20} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">תאריך יציאה</p>
                          <p className="text-lg font-black text-slate-800 mt-1">{selectedBooking.checkOut}</p>
                          <p className="text-sm text-indigo-600 font-bold mt-1">{formatHebrewDate(selectedBooking.checkOut)}</p>
                          {getHoliday(selectedBooking.checkOut) && (
                            <p className="text-xs text-rose-600 font-black mt-1">🎉 {getHoliday(selectedBooking.checkOut)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unit & Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl">
                          <MapPin size={20} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">יחידה</p>
                          <p className="text-lg font-black text-slate-800 mt-1">
                            {units.find(u => u.id === selectedBooking.unitId)?.name || 'לא נמצא'}
                          </p>
                          {units.find(u => u.id === selectedBooking.unitId)?.region && (
                            <p className="text-xs text-emerald-600 font-bold mt-1">
                              {units.find(u => u.id === selectedBooking.unitId)?.region}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl">
                          <DollarSign size={20} className="text-amber-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">סה"כ מחיר</p>
                          <p className="text-2xl font-black text-slate-800 mt-1">₪{selectedBooking.totalPrice.toLocaleString()}</p>
                          {(() => {
                            const checkIn = new Date(selectedBooking.checkIn);
                            const checkOut = new Date(selectedBooking.checkOut);
                            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                            return (
                              <p className="text-xs text-amber-600 font-bold mt-1">{nights} לילות</p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">סטטוס</p>
                    <div className="flex items-center gap-3">
                      {selectedBooking.status === BookingStatus.CONFIRMED && (
                        <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-black border border-emerald-200">
                          ✓ מאושר
                        </span>
                      )}
                      {selectedBooking.status === BookingStatus.PENDING && (
                        <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-black border border-amber-200">
                          ⏳ ממתין
                        </span>
                      )}
                      {selectedBooking.status === BookingStatus.CANCELLED && (
                        <span className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-black border border-rose-200">
                          ✗ בוטל
                        </span>
                      )}
                      {selectedBooking.status === BookingStatus.COMPLETED && (
                        <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-black border border-blue-200">
                          ✓ הושלם
                        </span>
                      )}
                      {selectedBooking.googleSynced && (
                        <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black border border-blue-100 flex items-center gap-2">
                          <CalendarIcon size={14} />
                          מסונכרן ליומן גוגל
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">שם אורח</label>
                      <input
                        type="text"
                        value={selectedBooking.guestName}
                        onChange={e => setSelectedBooking({ ...selectedBooking, guestName: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">טלפון אורח</label>
                      <input
                        type="tel"
                        value={selectedBooking.guestPhone}
                        onChange={e => setSelectedBooking({ ...selectedBooking, guestPhone: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תאריך כניסה</label>
                      <input
                        type="date"
                        value={selectedBooking.checkIn}
                        onChange={e => setSelectedBooking({ ...selectedBooking, checkIn: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                      />
                      {getHoliday(selectedBooking.checkIn) && (
                        <p className="text-xs text-rose-600 font-black mt-1 mr-2">🎉 {getHoliday(selectedBooking.checkIn)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">תאריך יציאה</label>
                      <input
                        type="date"
                        value={selectedBooking.checkOut}
                        onChange={e => setSelectedBooking({ ...selectedBooking, checkOut: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                      />
                      {getHoliday(selectedBooking.checkOut) && (
                        <p className="text-xs text-rose-600 font-black mt-1 mr-2">🎉 {getHoliday(selectedBooking.checkOut)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סה"כ מחיר</label>
                    <input
                      type="number"
                      value={selectedBooking.totalPrice}
                      onChange={e => setSelectedBooking({ ...selectedBooking, totalPrice: Number(e.target.value) })}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-2">סטטוס</label>
                    <select
                      value={selectedBooking.status}
                      onChange={e => setSelectedBooking({ ...selectedBooking, status: e.target.value as BookingStatus })}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 transition-all"
                    >
                      <option value={BookingStatus.PENDING}>Pending</option>
                      <option value={BookingStatus.CONFIRMED}>Confirmed</option>
                      <option value={BookingStatus.CANCELLED}>Cancelled</option>
                      <option value={BookingStatus.COMPLETED}>Completed</option>
                    </select>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      onClick={handleUpdateBooking}
                      disabled={loading}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Clock size={18} className="animate-spin" />
                          שומר...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          שמור שינויים
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setIsEditingBooking(false)}
                      className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
