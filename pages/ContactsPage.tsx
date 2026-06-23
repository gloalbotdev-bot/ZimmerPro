
import React, { useState, useEffect } from 'react';
import { AppState, Contact, UserRole } from '../types';
import { translations, Language } from '../translations';
import { contactsAPI } from '../api';
import { 
  Plus, Search, Phone, Mail, UserPlus, X, Trash2, Edit2, MoreVertical, MessageCircle
} from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

const ContactsPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;

  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '',
    role: '',
    phone: '',
    email: '',
    accountId: user?.accountId || db.accounts[0]?.id
  });

  // Load contacts from API on mount
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      console.log('👤 [ContactsPage] Loading contacts from API...');
      const data = await contactsAPI.getAll();
      console.log('👤 [ContactsPage] Contacts loaded:', data?.length || 0);
      setContacts(data || []);
      // Also update local db for compatibility
      setDb({ ...db, contacts: data || [] });
    } catch (err: any) {
      console.error('❌ [ContactsPage] Error loading contacts:', err);
      alert('שגיאה בטעינת אנשי הקשר: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) return;

    try {
      const contactData = {
        name: newContact.name!,
        role: newContact.role || 'General',
        phone: newContact.phone!,
        email: newContact.email || '',
        accountId: isAdmin ? (newContact.accountId || undefined) : (user?.accountId || undefined)
      };

      console.log('👤 [ContactsPage] Creating contact:', contactData);
      await contactsAPI.create(contactData);
      
      // Reload contacts from API
      await loadContacts();
      setShowModal(false);
      setNewContact({ name: '', role: '', phone: '', email: '', accountId: user?.accountId || db.accounts[0]?.id });
    } catch (err: any) {
      console.error('❌ [ContactsPage] Error creating contact:', err);
      alert('שגיאה ביצירת איש קשר: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('מחק איש קשר זה?')) return;

    try {
      console.log('👤 [ContactsPage] Deleting contact:', id);
      await contactsAPI.delete(id);
      // Reload contacts from API
      await loadContacts();
    } catch (err: any) {
      console.error('❌ [ContactsPage] Error deleting contact:', err);
      alert('שגיאה במחיקת איש קשר: ' + (err.message || 'Unknown error'));
    }
  };

  // Use contacts from state (loaded from API) instead of db.contacts
  // Backend already filters by accountId for non-admin users
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">{t.contacts}</h2>
          <p className="text-slate-500 font-medium">ניהול ספקים, אורחי VIP ואנשי תחזוקה.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          <UserPlus size={18} />
          {t.add_contact}
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className={`absolute ${t.dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="חפש לפי שם או טלפון..."
          className={`w-full bg-white border border-slate-100 rounded-2xl ${t.dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map(contact => (
          <div key={contact.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-800">{contact.name}</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{contact.role}</span>
                </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => handleDelete(contact.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
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

            <div className="flex gap-3 pt-4 border-t border-slate-50">
               <a href={`tel:${contact.phone}`} className="flex-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all">
                  <Phone size={14} /> CALL
               </a>
               <button className="flex-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all">
                  <MessageCircle size={14} /> CHAT
               </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl z-10 overflow-hidden animate-scaleIn">
            <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">{t.add_contact}</h3>
              <X size={24} className="text-slate-400 cursor-pointer" onClick={() => setShowModal(false)} />
            </div>
            <div className="p-4 sm:p-6 md:p-8 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.name}</label>
                <input 
                  type="text" 
                  value={newContact.name}
                  onChange={e => setNewContact({...newContact, name: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                  placeholder="למשל: יוני אינסטלציה"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.role}</label>
                <input 
                  type="text" 
                  value={newContact.role}
                  onChange={e => setNewContact({...newContact, role: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                  placeholder="למשל: ספק כביסה / אחזקה"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.phone}</label>
                <input 
                  type="tel" 
                  value={newContact.phone}
                  onChange={e => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.email}</label>
                <input 
                  type="email" 
                  value={newContact.email}
                  onChange={e => setNewContact({...newContact, email: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                />
              </div>
            </div>
            <div className="p-4 sm:p-6 md:p-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
              <button onClick={handleAddContact} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg shadow-slate-200">{t.save}</button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
