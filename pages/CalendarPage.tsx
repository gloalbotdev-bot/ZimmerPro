import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, Booking, BookingStatus } from '../types';
import { translations, Language } from '../translations';
import { bookingsAPI } from '../api';
import { useCalendarData } from '../hooks/useCalendarData';
import CalendarHeader from '../components/calendar/CalendarHeader';
import MonthGridView from '../components/calendar/MonthGridView';
import WeekGridView from '../components/calendar/WeekGridView';
import DayDetailView from '../components/calendar/DayDetailView';
import DayHoverPopover from '../components/calendar/DayHoverPopover';
import DaySidePanel from '../components/calendar/DaySidePanel';
import BookingFormModal, { translateBookingError } from '../components/booking/BookingFormModal';
import BookingDetailsModal from '../components/booking/BookingDetailsModal';
import {
  ViewMode,
  getCalendarDays,
  formatDate,
  addMonths,
  addWeeks,
} from '../utils/calendarUtils';
import { getDayOccupancy, bookingsOverlap } from '../utils/bookingOccupancy';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

type ToastType = 'error' | 'warning' | 'success' | 'info';
interface Toast { id: number; type: ToastType; title: string; message?: string; }
let toastCounter = 0;

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;
  const icons = { error: AlertCircle, warning: AlertTriangle, success: CheckCircle2, info: Info };
  const styles = {
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        return (
          <div key={toast.id} className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl pointer-events-auto animate-fadeIn ${styles[toast.type]}`} dir="rtl">
            <Icon size={20} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">{toast.title}</p>
              {toast.message && <p className="text-xs font-medium mt-0.5 opacity-80">{toast.message}</p>}
            </div>
            <button type="button" onClick={() => onDismiss(toast.id)} className="opacity-50 hover:opacity-100"><X size={16} /></button>
          </div>
        );
      })}
    </div>
  );
};

const CalendarPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const {
    units, bookings, loading, setLoading,
    displayedUnits, loadBookings,
  } = useCalendarData({ db, setDb });

  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [anchorDate, setAnchorDate] = useState(now);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | undefined>();
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentBooking, setCurrentBooking] = useState<Partial<Booking>>({
    unitId: '', guestName: '', guestPhone: '', checkIn: '', checkOut: '', totalPrice: 0, status: BookingStatus.PENDING,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: ToastType, title: string, message?: string) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 5000);
  };

  const calendarDays = getCalendarDays(currentMonth, currentYear);
  const panelDate = selectedDate || anchorDate;
  const panelOccupancy = getDayOccupancy(panelDate, displayedUnits, bookings);

  const handleDayHover = useCallback((dateKey: string | null, rect?: DOMRect) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (!dateKey) {
      hoverTimeout.current = setTimeout(() => {
        setHoveredDateKey(null);
        setHoverRect(undefined);
      }, 80);
      return;
    }
    setHoveredDateKey(dateKey);
    setHoverRect(rect);
  }, []);

  useEffect(() => () => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }, []);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setAnchorDate(date);
    setSidePanelOpen(true);
  };

  const openAddBooking = (checkIn?: string, unitId?: string) => {
    setModalMode('add');
    setCurrentBooking({
      unitId: unitId || '',
      guestName: '',
      guestPhone: '',
      checkIn: checkIn || (selectedDate ? formatDate(selectedDate) : ''),
      checkOut: '',
      totalPrice: 0,
      status: BookingStatus.PENDING,
    });
    setFieldErrors({});
    setSidePanelOpen(false);
    setShowBookingModal(true);
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const navigatePrevious = () => {
    if (viewMode === 'month') {
      const { month, year } = addMonths(currentMonth, currentYear, -1);
      setCurrentMonth(month);
      setCurrentYear(year);
    } else if (viewMode === 'week') {
      setAnchorDate(addWeeks(anchorDate, -1));
    } else {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - 1);
      setAnchorDate(d);
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      const { month, year } = addMonths(currentMonth, currentYear, 1);
      setCurrentMonth(month);
      setCurrentYear(year);
    } else if (viewMode === 'week') {
      setAnchorDate(addWeeks(anchorDate, 1));
    } else {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() + 1);
      setAnchorDate(d);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setAnchorDate(today);
    setSelectedDate(today);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'day') setAnchorDate(selectedDate || anchorDate);
    if (mode === 'week' || mode === 'month') setSidePanelOpen(false);
  };

  const validateBooking = (): boolean => {
    const errors: Record<string, string> = {};
    if (!currentBooking.unitId) errors.unitId = 'יש לבחור יחידה';
    if (!currentBooking.guestName?.trim()) errors.guestName = 'יש להזין שם אורח';
    if (!currentBooking.guestPhone?.trim()) errors.guestPhone = 'יש להזין טלפון';
    if (!currentBooking.checkIn) errors.checkIn = 'יש לבחור תאריך כניסה';
    if (!currentBooking.checkOut) errors.checkOut = 'יש לבחור תאריך יציאה';
    if (currentBooking.checkIn && currentBooking.checkOut && currentBooking.checkIn >= currentBooking.checkOut) {
      errors.checkOut = 'תאריך יציאה חייב להיות אחרי כניסה';
    }
    if (!currentBooking.totalPrice) errors.totalPrice = 'המחיר חייב להיות גדול מ-0';

    if (
      currentBooking.unitId &&
      currentBooking.checkIn &&
      currentBooking.checkOut &&
      bookingsOverlap(
        currentBooking.unitId,
        currentBooking.checkIn,
        currentBooking.checkOut,
        bookings,
        modalMode === 'edit' ? currentBooking.id : undefined
      )
    ) {
      errors.checkIn = 'תאריכים תפוסים';
      errors.checkOut = 'תאריכים תפוסים';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBooking = async () => {
    if (!validateBooking()) return;
    try {
      setLoading(true);
      if (modalMode === 'edit' && currentBooking.id) {
        await bookingsAPI.update(currentBooking.id, currentBooking);
        addToast('success', 'ההזמנה עודכנה בהצלחה');
      } else {
        await bookingsAPI.create(currentBooking);
        addToast('success', 'ההזמנה נוצרה בהצלחה');
      }
      await loadBookings();
      setShowBookingModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      const { title, detail } = translateBookingError(message);
      if (message.includes('already booked')) {
        setFieldErrors({ checkIn: 'תאריכים תפוסים', checkOut: 'תאריכים תפוסים' });
      }
      addToast('error', title, detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col" dir={t.dir}>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))} />

      <CalendarHeader
        lang={lang}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        currentMonth={currentMonth}
        currentYear={currentYear}
        anchorDate={anchorDate}
        onPrevious={navigatePrevious}
        onNext={navigateNext}
        onToday={goToToday}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-[500px] max-h-[calc(100vh-220px)] p-3 overflow-hidden">
          {loading && displayedUnits.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">טוען יומן...</div>
          ) : displayedUnits.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-300 font-bold p-20">
              אין יחידות להצגה ביומן.
            </div>
          ) : (
            <>
              {viewMode === 'month' && (
                <MonthGridView
                  calendarDays={calendarDays}
                  units={displayedUnits}
                  bookings={bookings}
                  selectedDate={selectedDate}
                  onDayClick={handleDayClick}
                  onDayHover={handleDayHover}
                />
              )}
              {viewMode === 'week' && (
                <WeekGridView
                  anchorDate={anchorDate}
                  units={displayedUnits}
                  bookings={bookings}
                  selectedDate={selectedDate}
                  onDayClick={handleDayClick}
                  onDayHover={handleDayHover}
                />
              )}
              {viewMode === 'day' && (
                <DayDetailView
                  date={anchorDate}
                  units={displayedUnits}
                  bookings={bookings}
                  onAddBooking={() => openAddBooking(formatDate(anchorDate))}
                  onBookUnit={unitId => openAddBooking(formatDate(anchorDate), unitId)}
                  onViewBooking={handleViewBooking}
                />
              )}
            </>
          )}
        </div>

        {sidePanelOpen && selectedDate && viewMode !== 'day' && (
          <div className="lg:w-96 shrink-0 flex flex-col min-h-0 max-h-[calc(100vh-220px)]">
            <DaySidePanel
              date={selectedDate}
              occupancy={panelOccupancy}
              onClose={() => { setSidePanelOpen(false); setSelectedDate(null); }}
              onAddBooking={() => openAddBooking(formatDate(selectedDate))}
              onBookUnit={unitId => openAddBooking(formatDate(selectedDate), unitId)}
              onViewBooking={handleViewBooking}
            />
          </div>
        )}
      </div>

      {hoveredDateKey && viewMode !== 'day' && (
        <DayHoverPopover
          dateKey={hoveredDateKey}
          units={displayedUnits}
          bookings={bookings}
          anchorRect={hoverRect}
        />
      )}

      <BookingFormModal
        isOpen={showBookingModal}
        mode={modalMode}
        currentBooking={currentBooking}
        onChange={setCurrentBooking}
        onClose={() => { setShowBookingModal(false); setFieldErrors({}); }}
        onSave={handleSaveBooking}
        loading={loading}
        units={displayedUnits}
        fieldErrors={fieldErrors}
        existingBookings={bookings}
      />

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          units={units}
          isOpen={showDetailsModal}
          onClose={() => { setShowDetailsModal(false); setSelectedBooking(null); }}
          onUpdated={async () => {
            await loadBookings();
            addToast('success', 'ההזמנה עודכנה בהצלחה');
          }}
          onError={msg => {
            const { title, detail } = translateBookingError(msg);
            addToast('error', title, detail);
          }}
        />
      )}
    </div>
  );
};

export default CalendarPage;
