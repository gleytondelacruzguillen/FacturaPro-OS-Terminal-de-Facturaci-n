import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Package, 
  Hash, 
  DollarSign, 
  BarChart, 
  Edit, 
  Trash2, 
  X,
  PackagePlus,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Product } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({ code: '', name: '', price: 0, stock: 0 });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    if (!auth.currentUser) return;
    setLoading(true);
    const userId = auth.currentUser.uid;
    try {
      const q = query(collection(db, 'users', userId, 'products'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !formData.name || !formData.code) return;
    const userId = auth.currentUser.uid;
    setLoading(true);

    try {
      if (selectedProduct?.id) {
        await updateDoc(doc(db, 'users', userId, 'products', selectedProduct.id), {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'users', userId, 'products'), {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock),
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setFormData({ code: '', name: '', price: 0, stock: 0 });
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!auth.currentUser || !window.confirm('¿Está seguro de eliminar este producto?')) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'products', id));
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Control de Inventario</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestión Centralizada de Activos v3.0</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              placeholder="FILTRAR PRODUCTOS..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-none w-64 shadow-sm outline-none focus:border-slate-900 transition-all font-black text-[10px] uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => {
              setFormData({ code: '', name: '', price: 0, stock: 0 });
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-none font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all active:scale-95"
          >
            <PackagePlus size={14} />
            ALTA DE ARTÍCULO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && products.length === 0 ? (
          <div className="col-span-full h-64 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-300">Sincronizando Stock...</div>
        ) : filteredProducts.map((p) => (
          <motion.div
            layout
            key={p.id}
            className="bg-white p-8 border border-slate-200 shadow-sm hover:border-slate-900 transition-all group relative flex flex-col"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
              <button 
                onClick={() => {
                  setSelectedProduct(p);
                  setFormData({ code: p.code, name: p.name, price: p.price, stock: p.stock });
                  setIsModalOpen(true);
                }}
                className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-100 shadow-sm transition-all"
              >
                <Edit size={12} />
              </button>
              <button 
                onClick={() => deleteProduct(p.id!)}
                className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-100 shadow-sm transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>

            <div className="flex-1 space-y-6">
              <div className="inline-flex py-1 px-3 bg-slate-50 border border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                REF: {p.code}
              </div>
              
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-tight line-clamp-2 uppercase tracking-tight">{p.name}</h3>
                <p className={cn(
                  "mt-3 text-[10px] font-black uppercase flex items-center gap-2 tracking-widest",
                  p.stock <= 5 ? "text-red-600" : "text-emerald-600"
                )}>
                  <BarChart size={12} /> {p.stock} UNIDADES
                </p>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-200">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Costo Nominal</span>
                <span className="text-xl font-black text-slate-900 font-mono tracking-tighter">${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            <div className="mt-8 border-t border-slate-100 pt-4">
              <button className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-900 border border-slate-100 hover:border-slate-900 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all group/btn">
                ANALIZAR <ArrowUpRight size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
        {filteredProducts.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 border-2 border-dashed border-slate-100">STOCK VACÍO</div>
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
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{selectedProduct ? 'Modificar Artículo' : 'Nuevo Activo'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuración de Parámetros de Inventario</p>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código Único</label>
                    <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                      <Hash size={16} className="text-slate-200" />
                      <input 
                        required
                        className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight w-full"
                        placeholder="ID-000"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Existencia</label>
                    <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                      <BarChart size={16} className="text-slate-200" />
                      <input 
                        type="number"
                        required
                        className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight w-full"
                        placeholder="0"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción del Bien</label>
                  <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                    <Package size={16} className="text-slate-200" />
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo por Unidad ($)</label>
                  <div className="flex items-center gap-3 border-b-2 border-slate-100 py-2 focus-within:border-slate-900 transition-colors">
                    <DollarSign size={16} className="text-slate-200" />
                    <input 
                      type="number"
                      step="0.01"
                      required
                      className="bg-transparent outline-none flex-1 font-black text-sm text-slate-900 placeholder:text-slate-100 uppercase tracking-tight"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
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
                    {loading ? 'PROCESANDO...' : (selectedProduct ? 'CONFIRMAR CAMBIOS' : 'REGISTRAR ARTÍCULO')}
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
