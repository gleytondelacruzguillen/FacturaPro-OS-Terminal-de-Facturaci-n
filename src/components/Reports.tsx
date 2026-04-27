import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  Layers,
  ArrowUpRight,
  PieChart
} from 'lucide-react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Invoice, Product } from '../types';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    dailySales: 0,
    monthlySales: 0,
    topProduct: { name: 'Cargando...', total: 0 },
    pendingCollection: 0
  });

  useEffect(() => {
    async function fetchStats() {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      
      try {
        const invoicesRef = collection(db, 'users', userId, 'invoices');
        const now = new Date();
        
        const qToday = query(invoicesRef, where('date', '>=', startOfDay(now)), where('date', '<=', endOfDay(now)));
        const qMonth = query(invoicesRef, where('date', '>=', startOfMonth(now)), where('date', '<=', endOfMonth(now)));
        
        const [todaySnap, monthSnap, allSnap] = await Promise.all([
          getDocs(qToday),
          getDocs(qMonth),
          getDocs(invoicesRef)
        ]);

        let todayTotal = 0;
        todaySnap.forEach(d => todayTotal += d.data().total);

        let monthTotal = 0;
        monthSnap.forEach(d => monthTotal += d.data().total);

        let pending = 0;
        const productStats: Record<string, { name: string, qty: number }> = {};
        
        allSnap.forEach(d => {
          const inv = d.data() as Invoice;
          if (inv.status === 'Pendiente') pending += inv.total;
          
          inv.items.forEach(item => {
            if (!productStats[item.code]) {
              productStats[item.code] = { name: item.description, qty: 0 };
            }
            productStats[item.code].qty += item.quantity;
          });
        });

        const top = Object.values(productStats).sort((a, b) => b.qty - a.qty)[0] || { name: 'N/A', qty: 0 };

        setStats({
          dailySales: todayTotal,
          monthlySales: monthTotal,
          topProduct: { name: top.name, total: top.qty },
          pendingCollection: pending
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const reportItems = [
    { name: 'Ventas de Hoy', value: `$${stats.dailySales.toLocaleString()}`, change: '+12.5%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Ventas del Mes', value: `$${stats.monthlySales.toLocaleString()}`, change: '+8.2%', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Cobros Pendientes', value: `$${stats.pendingCollection.toLocaleString()}`, change: '-2.4%', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Producto Estrella', value: stats.topProduct.name, change: `${stats.topProduct.total} vendidos`, icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  function Clock({ size, className }: { size: number, className?: string }) {
    return <Calendar size={size} className={className} />;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Análisis de Operaciones</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Inteligencia de Datos Aplicada v2.0</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-none border border-slate-200">
          <button className="px-5 py-2 bg-slate-900 text-white rounded-none text-[9px] font-black uppercase tracking-widest shadow-lg">Este Mes</button>
          <button className="px-5 py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-slate-900 transition-colors">Mes Pasado</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportItems.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 border border-slate-200 shadow-sm hover:border-slate-900 transition-all group"
          >
            <div className={cn("inline-flex p-3 border mb-4 transition-transform", 
              item.bg, item.color, 
              item.name === 'Ventas de Hoy' ? 'border-emerald-200' : 
              item.name === 'Ventas del Mes' ? 'border-blue-200' : 
              item.name === 'Cobros Pendientes' ? 'border-amber-200' : 'border-indigo-200'
            )}>
              <item.icon size={20} />
            </div>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{item.name}</p>
            <h3 className="text-xl font-black text-slate-900 mt-1 truncate uppercase tracking-tighter">{item.value}</h3>
            <div className="mt-4 flex items-center gap-1.5 border-t border-slate-50 pt-2">
              <span className={cn(
                "text-[9px] font-black px-2 py-0.5 border",
                item.change.startsWith('+') ? "border-emerald-200 text-emerald-600 bg-emerald-50" : "border-red-200 text-red-600 bg-red-50"
              )}>
                {item.change}
              </span>
              <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest">DELTA REF</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Rendimiento Semanal</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-900" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ventas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cobros</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between px-4 pb-4 border-b-2 border-l-2 border-slate-900 relative">
            {[45, 60, 55, 80, 70, 90, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                <div 
                  className="w-2/3 bg-slate-900 transition-all group-hover:bg-blue-600 shadow-xl shadow-slate-100" 
                  style={{ height: `${h}%` }}
                />
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] px-2 py-1 font-black uppercase tracking-widest">
                  ${(h * 1000).toLocaleString()}
                </div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2">D-{i + 1}</span>
              </div>
            ))}
            <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between text-[8px] font-black text-slate-300 uppercase pr-4">
              <span>100K</span>
              <span>50K</span>
              <span>0</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-8 border border-slate-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-10 border-b border-slate-200 pb-4">Distribución</h3>
          <div className="space-y-8">
            {[
              { label: 'Ferretería', val: 65, color: 'bg-slate-900' },
              { label: 'Servicios', val: 20, color: 'bg-blue-600' },
              { label: 'Materiales', val: 15, color: 'bg-slate-400' },
            ].map(cat => (
              <div key={cat.label} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{cat.label}</span>
                  <span className="text-[10px] font-black text-slate-900 font-mono italic">{cat.val}%</span>
                </div>
                <div className="w-full h-1 bg-white border border-slate-200 overflow-hidden">
                  <div className={cn("h-full transition-all duration-500", cat.color)} style={{ width: `${cat.val}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 bg-white p-6 border border-slate-900 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 border border-emerald-200 text-emerald-600">
                <PieChart size={16} />
              </div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Rango de Salud</p>
            </div>
            <span className="text-[9px] font-black text-white bg-emerald-500 px-3 py-1 uppercase tracking-widest">Óptimo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
