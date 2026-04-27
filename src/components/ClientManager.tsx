import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Edit, 
  Trash2, 
  X, 
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Client } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Client>>({ name: '', phone: '', address: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    if (!auth.currentUser) return;
    setLoading(true);
    const userId = auth.currentUser.uid;
    try {
      const q = query(collection(db, 'users', userId, 'clients'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !formData.name) return;
    const userId = auth.currentUser.uid;
    setLoading(true);

    try {
      if (selectedClient?.id) {
        // Edit
        await updateDoc(doc(db, 'users', userId, 'clients', selectedClient.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create
        await addDoc(collection(db, 'users', userId, 'clients'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', address: '' });
      setSelectedClient(null);
      fetchClients();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!auth.currentUser || !window.confirm('¿Está seguro de eliminar este cliente?')) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'clients', id));
      setClients(clients.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Directorio de Carteras</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestión de Activos Relacionales v1.2</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              placeholder="FILTRAR REGISTROS..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-none w-64 shadow-sm outline-none focus:border-slate-900 transition-all font-black text-[10px] uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => {
              setFormData({ name: '', phone: '', address: '' });
              setSelectedClient(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            <UserPlus size={14} />
            ALTA DE CLIENTE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && clients.length === 0 ? (
          <div className="col-span-full h-64 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-300">Recuperando Folios de Clientes...</div>
        ) : filteredClients.map((client) => (
          <motion.div
            layout
            key={client.id}
            className="bg-white p-8 border border-slate-200 shadow-sm hover:border-slate-900 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button 
                onClick={() => {
                  setSelectedClient(client);
                  setFormData({ name: client.name, phone: client.phone, address: client.address });
                  setIsModalOpen(true);
                }}
                className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-100 shadow-sm transition-all"
              >
                <Edit size={12} />
              </button>
              <button 
                onClick={() => deleteClient(client.id!)}
                className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-100 shadow-sm transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>

            <div className="flex items-start gap-5">
              <div className="w-14 h-14 bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-slate-100">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{client.name}</h3>
                <div className="mt-4 space-y-3">
                  <p className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">
                    <Phone size={12} className="text-slate-300" /> {client.phone || 'SIN CONTACTO'}
                  </p>
                  <p className="flex items-start gap-3 text-[10px] font-bold text-slate-500 leading-tight uppercase italic min-h-[2.5rem]">
                    <MapPin size={12} className="text-slate-300 shrink-0" /> 
                    <span className="line-clamp-2">{client.address || 'DIRECCIÓN NO REGISTRADA'}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">REGISTRO: {client.createdAt ? format(client.createdAt.toDate(), 'MMM yyyy', { locale: es }) : 'N/A'}</span>
              <button className="text-blue-600 hover:text-blue-700 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 group/btn">
                AUDITAR <ChevronRight size={10} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
        {filteredClients.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 border-2 border-dashed border-slate-100">CERO RESULTADOS EN EL DIRECTORIO</div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white border-2 border-slate-900 shadow-2xl p-10 overflow-hidden"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-8 border-b-2 border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{selectedClient ? 'Modificar Registro' : 'Nueva Entidad'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Actualización de Parámetros de Cliente</p>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razón Social / Nombre</label>
                  <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                    <User size={16} className="text-slate-200" />
                    <input 
                      required
                      className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight"
                      placeholder="ESCRIBA EL NOMBRE..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacto Directo</label>
                  <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                    <Phone size={16} className="text-slate-200" />
                    <input 
                      className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight"
                      placeholder="8XX-XXX-XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sede Fiscal / Dirección</label>
                  <div className="flex items-start gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                    <MapPin size={16} className="text-slate-200 mt-1" />
                    <textarea 
                      rows={2}
                      className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight resize-none"
                      placeholder="DETALLE DE UBICACIÓN..."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-slate-900 transition-colors border border-transparent hover:border-slate-300"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'PROCESANDO...' : (selectedClient ? 'CONFIRMAR CAMBIOS' : 'REGISTRAR ENTIDAD')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
