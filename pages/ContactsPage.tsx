
import React, { useState, useEffect } from 'react';
import { AppState, Contact, GuestContact, UserRole } from '../types';
import { translations, Language } from '../translations';
import { contactsAPI } from '../api';
import {
  Search, Phone, Mail, UserPlus, X, Trash2, Edit2, MessageCircle, Truck, User, Loader2
} from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

type TabType = 'suppliers' | 'customers';

function normalizePhoneForWhatsApp(phone: string): string {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '972' + digits.slice(1);
  }
  return digits;
}

function toDateInputValue(dateStr?: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '—';
  if (dateStr.includes('/')) return dateStr;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const ContactsPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;

  const [activeTab, setActiveTab] = useState<TabType>('suppliers');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [guests, setGuests] = useState<GuestContact[]>([]);
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '',
    role: '',
    phone: '',
    email: '',
    notes: '',
    lastOrderDate: '',
    orderCount: 0,
    type: 'supplier'
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsData, guestsData] = await Promise.all([
        contactsAPI.getAll(),
        contactsAPI.getGuests()
      ]);
      setContacts(contactsData || []);
      setGuests(guestsData || []);
      setDb({ ...db, contacts: contactsData || [] });
    } catch (err: any) {
      console.error('❌ [ContactsPage] Error loading:', err);
      alert('שגיאה בטעינת אנשי הקשר: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewContact({
      name: '',
      role: '',
      phone: '',
      email: '',
      notes: '',
      lastOrderDate: '',
      orderCount: 0,
      type: 'supplier'
    });
    setEditingContact(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setNewContact({
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      email: contact.email || '',
      notes: contact.notes || '',
      lastOrderDate: contact.lastOrderDate || '',
      orderCount: contact.orderCount ?? 0,
      type: 'supplier'
    });
    setShowModal(true);
  };

  const handleSaveContact = async () => {
    if (!newContact.name || !newContact.phone) return;

    try {
      const contactData = {
        name: newContact.name!,
        role: newContact.role || 'General',
        phone: newContact.phone!,
        email: newContact.email || '',
        notes: newContact.notes || '',
        lastOrderDate: newContact.lastOrderDate || '',
        orderCount: newContact.orderCount ?? 0,
        type: 'supplier' as const,
        ...(isAdmin && newContact.accountId ? { accountId: newContact.accountId } : {})
      };

      if (editingContact) {
        await contactsAPI.update(editingContact.id, contactData);
      } else {
        await contactsAPI.create(contactData);
      }

      await loadData();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error('❌ [ContactsPage] Error saving contact:', err);
      alert('שגיאה בשמירת ספק: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('מחק ספק זה?')) return;

    try {
      await contactsAPI.delete(id);
      await loadData();
    } catch (err: any) {
      console.error('❌ [ContactsPage] Error deleting contact:', err);
      alert('שגיאה במחיקת ספק: ' + (err.message || 'Unknown error'));
    }
  };

  const suppliers = contacts.filter(c => !c.type || c.type === 'supplier');

  const filteredSuppliers = suppliers.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.phone.includes(searchTerm);
  });

  const filteredGuests = guests.filter(g => {
    const term = searchTerm.toLowerCase();
    if (g.name.toLowerCase().includes(term)) return true;
    return g.unitStays?.some(s => s.unitName.toLowerCase().includes(term));
  });

  const renderMetaColumn = (
    dateLabel: string,
    dateValue: string,
    countLabel: string,
    countValue: number,
    description?: string
  ) => (
    <div className="flex-shrink-0 w-28 sm:w-32 space-y-1 text-[10px] font-bold text-slate-400 leading-tight">
      <p>{dateLabel}: {dateValue || '—'}</p>
      <p>{countLabel}: {countValue} {t.times}</p>
      {description && (
        <p className="text-slate-500 font-medium pt-1 line-clamp-2">{description}</p>
      )}
    </div>
  );

  const renderGuestMetaColumn = (guest: GuestContact) => (
    <div className="flex-shrink-0 w-32 sm:w-40 space-y-2 text-[10px] font-bold text-slate-400 leading-tight">
      <p className="text-slate-500">{t.total_stays}: {guest.stayCount} {t.times}</p>
      {(guest.unitStays || []).map(stay => (
        <div key={stay.unitId} className="border-t border-slate-100 pt-1.5 space-y-0.5">
          <p className="text-slate-700 font-black truncate" title={stay.unitName}>{stay.unitName}</p>
          <p>{t.last_stay}: {stay.lastStayDate || '—'}</p>
          <p>{stay.stayCount} {t.times}</p>
        </div>
      ))}
      {guest.notes && (
        <p className="text-slate-500 font-medium pt-1 line-clamp-2 border-t border-slate-100">{guest.notes}</p>
      )}
    </div>
  );

  const renderActionButtons = (phone: string, showCall: boolean) => (
    <div className="flex gap-2 pt-4 border-t border-slate-50">
      {showCall && (
        <a
          href={`tel:${phone}`}
          className="flex-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all"
        >
          <Phone size={14} /> CALL
        </a>
      )}
      <a
        href={`sms:${phone}`}
        className="flex-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all"
      >
        <MessageCircle size={14} /> CHAT
      </a>
      <a
        href={`https://wa.me/${normalizePhoneForWhatsApp(phone)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 bg-slate-50 hover:bg-green-50 hover:text-green-600 text-slate-500 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        WhatsApp
      </a>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">{t.contacts}</h2>
          <p className="text-slate-500 font-medium">{t.contacts_subtitle}</p>
        </div>
        {activeTab === 'suppliers' && (
          <button
            onClick={openAddModal}
            className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <UserPlus size={18} />
            {t.add_supplier}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); }}
          className={`p-5 rounded-2xl border-2 font-black flex items-center justify-center gap-3 transition-all ${
            activeTab === 'suppliers'
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md'
              : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
          }`}
        >
          <Truck size={22} />
          {t.suppliers}
        </button>
        <button
          onClick={() => { setActiveTab('customers'); setSearchTerm(''); }}
          className={`p-5 rounded-2xl border-2 font-black flex items-center justify-center gap-3 transition-all ${
            activeTab === 'customers'
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md'
              : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
          }`}
        >
          <User size={22} />
          {t.customers}
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className={`absolute ${t.dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={activeTab === 'suppliers' ? t.search_contacts : t.search_customers}
          className={`w-full bg-white border border-slate-100 rounded-2xl ${t.dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all`}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : activeTab === 'suppliers' ? (
        filteredSuppliers.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-medium">{t.no_suppliers}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSuppliers.map(contact => (
              <div key={contact.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600 font-black text-lg shadow-inner">
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(contact)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(contact.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 mb-2">
                  {renderMetaColumn(
                    t.last_order,
                    formatDisplayDate(contact.lastOrderDate),
                    t.order_count,
                    contact.orderCount ?? 0,
                    contact.notes
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-lg">{contact.name}</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{contact.role}</span>
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Phone size={14}/></div>
                        {contact.phone}
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Mail size={14}/></div>
                          {contact.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {renderActionButtons(contact.phone, true)}
              </div>
            ))}
          </div>
        )
      ) : (
        filteredGuests.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-medium">{t.no_customers}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredGuests.map(guest => (
              <div key={guest.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600 font-black text-lg shadow-inner">
                    {guest.name.charAt(0)}
                  </div>
                </div>

                <div className="flex gap-4 mb-2">
                  {renderGuestMetaColumn(guest)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-lg">{guest.name}</h3>
                    {(guest.unitStays?.length ?? 0) > 1 && (
                      <p className="text-[10px] font-bold text-indigo-500 mt-1">
                        {t.stayed_in_units} {guest.unitStays.length} {t.units}
                      </p>
                    )}
                  </div>
                </div>

                {renderActionButtons(guest.phone, false)}
              </div>
            ))}
          </div>
        )
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }}></div>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl z-10 overflow-hidden animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">
                {editingContact ? t.edit_supplier : t.add_supplier}
              </h3>
              <X size={24} className="text-slate-400 cursor-pointer" onClick={() => { setShowModal(false); resetForm(); }} />
            </div>
            <div className="p-4 sm:p-6 md:p-8 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.name}</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                  placeholder="למשל: יוני אינסטלציה"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.role}</label>
                <input
                  type="text"
                  value={newContact.role}
                  onChange={e => setNewContact({ ...newContact, role: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                  placeholder="למשל: ספק כביסה / אחזקה"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.phone}</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.email}</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.description}</label>
                <input
                  type="text"
                  value={newContact.notes}
                  onChange={e => setNewContact({ ...newContact, notes: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                  placeholder="למשל: להתקשר רק בבקרים"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.last_order}</label>
                  <input
                    type="date"
                    value={toDateInputValue(newContact.lastOrderDate)}
                    onChange={e => {
                      const [y, m, d] = e.target.value.split('-');
                      setNewContact({
                        ...newContact,
                        lastOrderDate: e.target.value ? `${d}/${m}/${y}` : ''
                      });
                    }}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.order_count}</label>
                  <input
                    type="number"
                    min={0}
                    value={newContact.orderCount ?? 0}
                    onChange={e => setNewContact({ ...newContact, orderCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 md:p-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
              <button onClick={handleSaveContact} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg shadow-slate-200">{t.save}</button>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
