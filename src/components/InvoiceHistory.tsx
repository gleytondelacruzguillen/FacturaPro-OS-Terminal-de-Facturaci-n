import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  FileText, 
  Printer, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Invoice } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Todas' | 'Pagada' | 'Pendiente'>('Todas');
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    if (!auth.currentUser) return;
    setLoading(true);
    const userId = auth.currentUser.uid;
    try {
      const q = query(collection(db, 'users', userId, 'invoices'), orderBy('invoiceNumber', 'desc'));
      const snap = await getDocs(q);
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const deleteInvoice = async (id: string) => {
    if (!auth.currentUser || !window.confirm('¿Está seguro de eliminar esta factura?')) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'invoices', id));
      setInvoices(invoices.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (invoice: Invoice) => {
    if (!auth.currentUser || !invoice.id) return;
    const userId = auth.currentUser.uid;
    const nextStatus = invoice.status === 'Pagada' ? 'Pendiente' : 'Pagada';
    try {
      await updateDoc(doc(db, 'users', userId, 'invoices', invoice.id), {
        status: nextStatus,
        updatedAt: new Date()
      });
      setInvoices(invoices.map(i => i.id === invoice.id ? { ...i, status: nextStatus } : i));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toString().includes(searchTerm) || 
      inv.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todas' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Archivo Maestro</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Acervo Histórico de Facturación v4.0</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              placeholder="FOLIO O CLIENTE..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-none w-64 shadow-sm outline-none focus:border-slate-900 transition-all font-black text-[10px] uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-none border border-slate-200">
            {['Todas', 'Pagada', 'Pendiente'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s as any)}
                className={cn(
                  "px-4 py-1.5 rounded-none text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                  filterStatus === s ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-900">
                <th className="px-8 py-4 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Referencia</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Destinatario</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Valor Nominal</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Medio</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Condición</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] text-right">Controles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20 text-[10px] font-black uppercase tracking-widest text-slate-300">Sincronizando Base de Datos...</td></tr>
              ) : filteredInvoices.map((inv) => (
                <motion.tr 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={inv.id} 
                  className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xl shadow-slate-200">
                        {inv.invoiceNumber}
                      </div>
                      <div>
                        <p className="font-black text-xs text-slate-900 uppercase tracking-tighter">#INV-{inv.invoiceNumber}</p>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{format(inv.date.toDate(), 'PPP', { locale: es })}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-xs text-slate-900 uppercase">{inv.client.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 font-mono italic">{inv.client.phone || '---'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-900 text-sm font-mono tracking-tighter">${inv.total.toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[9px] font-black text-slate-500 border border-slate-200 px-2 py-0.5 rounded-none uppercase tracking-widest">
                      {inv.paymentType}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <button 
                      onClick={() => toggleStatus(inv)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all border",
                        inv.status === 'Pagada' 
                          ? "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" 
                          : "border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100"
                      )}
                    >
                      {inv.status}
                    </button>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => navigate(`/invoice/edit/${inv.id}`)}
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="Modificar"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => navigate(`/invoice/edit/${inv.id}`)}
                        className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all font-black text-[10px]"
                        title="Imprimir"
                      >
                        <Printer size={14} />
                      </button>
                      <button 
                        onClick={() => deleteInvoice(inv.id!)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Purgar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-24">
                    <div className="flex flex-col items-center gap-4 text-slate-200">
                      <FileText size={64} strokeWidth={1} />
                      <div className="space-y-1">
                        <p className="font-black text-slate-400 uppercase tracking-widest">Sin Coincidencias</p>
                        <p className="text-[10px] font-bold uppercase">No se hallaron registros bajo los criterios actuales.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
