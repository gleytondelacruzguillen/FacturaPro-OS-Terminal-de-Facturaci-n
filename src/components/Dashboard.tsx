import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Package, 
  Users, 
  Clock, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  FileText,
  UserCheck,
  PackageCheck,
  Calculator
} from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Invoice } from '../types';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    pendingInvoices: 0,
    totalProducts: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      
      try {
        // Fetch stats
        const invoicesRef = collection(db, 'users', userId, 'invoices');
        const productsRef = collection(db, 'users', userId, 'products');

        const salesSnapshot = await getDocs(invoicesRef);
        const productsSnapshot = await getDocs(productsRef);

        let today = 0;
        let month = 0;
        let pending = 0;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const invoices: Invoice[] = [];
        salesSnapshot.forEach(doc => {
          const data = doc.data() as Invoice;
          const invoiceDate = data.date.toDate();
          
          if (invoiceDate >= startOfDay) today += data.total;
          if (invoiceDate >= startOfMonth) month += data.total;
          if (data.status === 'Pendiente') pending++;
          
          invoices.push({ id: doc.id, ...data });
        });

        // Sorted recent
        const sorted = invoices.sort((a, b) => b.date.toDate() - a.date.toDate()).slice(0, 5);

        setStats({
          todaySales: today,
          monthSales: month,
          pendingInvoices: pending,
          totalProducts: productsSnapshot.size
        });
        setRecentInvoices(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    { name: 'Ventas de Hoy', value: stats.todaySales, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', currency: true },
    { name: 'Ventas del Mes', value: stats.monthSales, icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50', currency: true },
    { name: 'Facturas Pendientes', value: stats.pendingInvoices, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', currency: false },
    { name: 'Total Productos', value: stats.totalProducts, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50', currency: false },
  ];

  if (loading) {
    return <div className="h-96 flex items-center justify-center">Cargando datos...</div>;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Panel de Inteligencia</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Monitoreo de Operaciones en Tiempo Real</p>
        </div>
        <button 
          onClick={() => navigate('/invoice/new')}
          className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          <PlusCircle size={16} />
          COMENZAR TRANSACCIÓN
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 border-l-4 border-slate-900 border-t border-r border-b border-slate-200 shadow-sm group hover:bg-slate-900 transition-all"
          >
            <div className={cn("inline-flex p-2 mb-4 group-hover:bg-white transition-all", card.bg, card.color)}>
              <card.icon size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-500 transition-all">{card.name}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase group-hover:text-white transition-all">
              {card.currency ? `$${card.value.toLocaleString()}` : card.value}
            </h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 overflow-hidden">
          <div className="px-8 py-4 border-b-2 border-slate-900 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Últimos Folio Registrados</h3>
            <button 
              onClick={() => navigate('/history')}
              className="text-[10px] font-black text-blue-600 uppercase hover:underline"
            >
              Auditoría Completa
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificativo</th>
                  <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entidad / Cliente</th>
                  <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Importe</th>
                  <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => navigate(`/history?id=${inv.id}`)}>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="font-black text-xs text-slate-900">#{inv.invoiceNumber}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{format(inv.date.toDate(), 'PPP', { locale: es })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 font-bold text-xs text-slate-700 uppercase">{inv.client.name}</td>
                    <td className="px-8 py-4 font-black text-xs text-slate-900 text-right font-mono">${inv.total.toLocaleString()}</td>
                    <td className="px-8 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 text-[9px] font-black uppercase tracking-widest inline-block border",
                        inv.status === 'Pagada' ? "border-emerald-200 text-emerald-600 bg-emerald-50" : "border-amber-200 text-amber-600 bg-amber-50"
                      )}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 text-white">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-6 text-slate-400">Acceso Rápido</h3>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => navigate('/invoice/new')}
                className="flex items-center justify-between p-4 bg-white/5 hover:bg-white text-white hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest border border-white/10 hover:border-white"
              >
                <span>Generar Factura</span>
                <PlusCircle size={14} />
              </button>
              <button 
                onClick={() => navigate('/clients')}
                className="flex items-center justify-between p-4 bg-white/5 hover:bg-white text-white hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest border border-white/10 hover:border-white"
              >
                <span>Gestión de Carteras</span>
                <UserCheck size={14} />
              </button>
              <button 
                onClick={() => navigate('/products')}
                className="flex items-center justify-between p-4 bg-white/5 hover:bg-white text-white hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest border border-white/10 hover:border-white"
              >
                <span>Inventario Activo</span>
                <PackageCheck size={14} />
              </button>
            </div>
          </div>

          <div className="bg-white p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-slate-900" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Eficiencia de Operación</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nivel de Logro</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">74%</p>
                </div>
                <TrendingUp size={24} className="text-blue-600 mb-1" />
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-none overflow-hidden">
                <div className="h-full bg-blue-600 rounded-none w-[74%]" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed italic mt-4">
                Índice de rendimiento optimizado. Superando promedios históricos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
