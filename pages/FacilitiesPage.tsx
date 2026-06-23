
import React, { useState, useEffect } from 'react';
import { AppState, Facility, UserRole } from '../types';
import { translations, Language } from '../translations';
import { facilitiesAPI } from '../api';
import { 
  Plus, Puzzle, Waves, Wifi, Wind, Tv, Coffee, Utensils, X, Trash2, Shield, Loader2,
  Car, Home, TreePine, Dumbbell, Music, Gamepad2, Flame, Snowflake, Droplet, Mountain,
  Camera, Lock, Phone, ParkingCircle, AirVent, Fan, Refrigerator, Microwave, Square,
  ChefHat, Sprout, Bath, Sofa, Armchair, Lamp, Battery, Zap, Star, Heart, Sparkles,
  Bed, Video, Play, Calendar, DollarSign, Clock, Settings2, Info, Sun, Moon
} from 'lucide-react';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

const FacilitiesPage: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [newFacility, setNewFacility] = useState<Partial<Facility>>({
    name: '',
    category: 'general',
    icon: 'Puzzle'
  });

  // Load facilities from API on mount
  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      setLoading(true);
      const data = await facilitiesAPI.getAll();
      setFacilities(data || []);
      // Also update db for backward compatibility
      setDb({ ...db, facilities: data || [] });
    } catch (error: any) {
      console.error('Error loading facilities:', error);
      alert('שגיאה בטעינת המתקנים: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const availableIcons = [
    { name: 'Waves', icon: Waves },
    { name: 'Wifi', icon: Wifi },
    { name: 'Wind', icon: Wind },
    { name: 'Tv', icon: Tv },
    { name: 'Coffee', icon: Coffee },
    { name: 'Utensils', icon: Utensils },
    { name: 'Shield', icon: Shield },
    { name: 'Puzzle', icon: Puzzle },
    { name: 'Car', icon: Car },
    { name: 'Home', icon: Home },
    { name: 'TreePine', icon: TreePine },
    { name: 'Dumbbell', icon: Dumbbell },
    { name: 'Music', icon: Music },
    { name: 'Gamepad2', icon: Gamepad2 },
    { name: 'Flame', icon: Flame },
    { name: 'Snowflake', icon: Snowflake },
    { name: 'Droplet', icon: Droplet },
    { name: 'Mountain', icon: Mountain },
    { name: 'Camera', icon: Camera },
    { name: 'Lock', icon: Lock },
    { name: 'Phone', icon: Phone },
    { name: 'ParkingCircle', icon: ParkingCircle },
    { name: 'AirVent', icon: AirVent },
    { name: 'Fan', icon: Fan },
    { name: 'Refrigerator', icon: Refrigerator },
    { name: 'Microwave', icon: Microwave },
    { name: 'Square', icon: Square },
    { name: 'ChefHat', icon: ChefHat },
    { name: 'Sprout', icon: Sprout },
    { name: 'Bath', icon: Bath },
    { name: 'Sofa', icon: Sofa },
    { name: 'Armchair', icon: Armchair },
    { name: 'Lamp', icon: Lamp },
    { name: 'Battery', icon: Battery },
    { name: 'Zap', icon: Zap },
    { name: 'Star', icon: Star },
    { name: 'Heart', icon: Heart },
    { name: 'Sparkles', icon: Sparkles },
    { name: 'Bed', icon: Bed },
    { name: 'Video', icon: Video },
    { name: 'Play', icon: Play },
    { name: 'Calendar', icon: Calendar },
    { name: 'DollarSign', icon: DollarSign },
    { name: 'Clock', icon: Clock },
    { name: 'Settings2', icon: Settings2 },
    { name: 'Info', icon: Info },
    { name: 'Sun', icon: Sun },
    { name: 'Moon', icon: Moon }
  ];

  const handleAdd = async () => {
    if (!newFacility.name) return;
    
    try {
      setLoading(true);
      const facilityData = {
        name: newFacility.name!,
        category: (newFacility.category as any) || 'general',
        icon: newFacility.icon || 'Puzzle'
      };
      
      const created = await facilitiesAPI.create(facilityData);
      await loadFacilities(); // Reload facilities from API
      setShowModal(false);
      setNewFacility({ name: '', category: 'general', icon: 'Puzzle' });
    } catch (error: any) {
      console.error('Error creating facility:', error);
      alert('שגיאה ביצירת מתקן: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המתקן הזה?')) return;
    
    try {
      setLoading(true);
      await facilitiesAPI.delete(id);
      await loadFacilities(); // Reload facilities from API
    } catch (error: any) {
      console.error('Error deleting facility:', error);
      alert('שגיאה במחיקת מתקן: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Facilities are global - no filtering needed
  const filteredFacilities = facilities;
  const getIconComp = (iconName: string) => {
    const found = availableIcons.find(i => i.name === iconName);
    const Comp = found ? found.icon : Puzzle;
    return <Comp size={24} />;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">{t.facilities}</h2>
          <p className="text-slate-500 font-medium">ניהול מתקנים, שירותים ואבזור המתחם.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          <Plus size={18} />
          {t.add_facility}
        </button>
      </div>

      {loading && facilities.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filteredFacilities.map(fac => (
          <div key={fac.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group relative hover:shadow-lg transition-all">
             <button onClick={() => handleDelete(fac.id)} className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 text-rose-500 bg-rose-50 rounded-xl transition-all"><Trash2 size={14}/></button>
             <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                {getIconComp(fac.icon)}
             </div>
             <h3 className="font-black text-slate-800 text-sm mb-1">{fac.name}</h3>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{fac.category}</span>
          </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl z-10 overflow-hidden animate-scaleIn">
            <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">{t.add_facility}</h3>
              <X size={24} className="text-slate-400 cursor-pointer" onClick={() => setShowModal(false)} />
            </div>
            <div className="p-4 sm:p-6 md:p-8 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.name}</label>
                <input 
                  type="text" 
                  value={newFacility.name}
                  onChange={e => setNewFacility({...newFacility, name: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 mr-1">{t.category}</label>
                <select 
                  value={newFacility.category}
                  onChange={e => setNewFacility({...newFacility, category: e.target.value as any})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold"
                >
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="service">Service</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3 mr-1">אייקון מייצג</label>
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                     {availableIcons.map(i => (
                       <button 
                        key={i.name}
                        onClick={() => setNewFacility({...newFacility, icon: i.name})}
                        className={`p-3 rounded-xl flex items-center justify-center border-2 transition-all hover:scale-110 ${newFacility.icon === i.name ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                        title={i.name}
                       >
                         <i.icon size={18} />
                       </button>
                     ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 md:p-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleAdd} 
                disabled={loading}
                className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {t.save}
              </button>
              <button 
                onClick={() => setShowModal(false)} 
                disabled={loading}
                className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl disabled:opacity-50"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitiesPage;
