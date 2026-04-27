import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Store, 
  MapPin, 
  Phone, 
  Percent, 
  Coins, 
  Save, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { BusinessSettings } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<BusinessSettings>({
    businessName: '',
    address: '',
    phone: '',
    taxPercentage: 18,
    currency: 'DOP',
    logo: ''
  });

  useEffect(() => {
    async function fetchSettings() {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      try {
        const snap = await getDoc(doc(db, 'users', userId, 'settings', 'current'));
        if (snap.exists()) {
          setFormData(snap.data() as BusinessSettings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSaving(true);
    setSuccess(false);
    const userId = auth.currentUser.uid;
    try {
      await setDoc(doc(db, 'users', userId, 'settings', 'current'), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-300">Sincronizando Preferencias...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Panel de Configuración</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Global System Parameters v1.0.4</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-slate-900 shadow-2xl overflow-hidden"
      >
        <div className="bg-slate-900 p-8 text-white flex items-center justify-between border-b-2 border-slate-900">
          <div className="flex items-center gap-5">
            <div className="p-3 border border-white/20">
              <Store size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Credenciales de Comercio</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Información de Origen Fiscal</p>
            </div>
          </div>
          {success && (
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 font-black text-[10px] uppercase tracking-widest"
            >
              <CheckCircle2 size={14} /> SINCRO OK
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSave} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Establecimiento</label>
              <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                <Store size={18} className="text-slate-200" />
                <input 
                  required
                  className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight"
                  placeholder="NOMBRE LEGAL..."
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enlace Telefónico</label>
              <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                <Phone size={18} className="text-slate-200" />
                <input 
                  className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight"
                  placeholder="8XX-XXX-XXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación de Operaciones</label>
              <div className="flex items-start gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                <MapPin size={18} className="text-slate-200 mt-1" />
                <textarea 
                  rows={2}
                  className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight resize-none leading-relaxed"
                  placeholder="DIRECCIÓN FÍSICA COMPLETA..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga Impositiva %</label>
              <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                <Percent size={18} className="text-slate-200" />
                <input 
                  type="number"
                  className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight font-mono"
                  placeholder="18"
                  value={formData.taxPercentage}
                  onChange={(e) => setFormData({ ...formData, taxPercentage: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Divisa de Referencia</label>
              <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                <Coins size={18} className="text-slate-200" />
                <input 
                  className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight"
                  placeholder="ISO CODE (EJ: DOP)"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-300 text-[9px] font-black uppercase tracking-widest italic">
              <AlertCircle size={14} />
              Los cambios afectan la generación de nuevos folios.
            </div>
            <button 
              type="submit"
              disabled={saving}
              className="flex items-center gap-4 px-12 py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'PROCESANDO...' : 'ACTUALIZAR CORE'}
            </button>
          </div>
        </form>
      </motion.div>

      <div className="p-10 bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-between gap-10">
        <div className="space-y-2">
          <h3 className="font-black text-slate-900 uppercase tracking-tight">Soporte Técnico Especializado</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Línea de Asistencia Directa v24/7</p>
        </div>
        <button className="px-8 py-3 bg-white border-2 border-slate-900 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95">
          CONTACTAR AGENTE
        </button>
      </div>
    </div>
  );
}
