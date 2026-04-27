import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  FileDown, 
  RefreshCcw, 
  Search,
  User,
  MapPin,
  Phone,
  Hash,
  Calendar,
  CreditCard,
  PlusCircle,
  X,
  Calculator,
  Package
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Invoice, InvoiceItem, Product, Client, BusinessSettings } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  
  // Invoice state
  const [invoiceNumber, setInvoiceNumber] = useState<number>(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentType, setPaymentType] = useState<Invoice['paymentType']>('Efectivo');
  const [status, setStatus] = useState<Invoice['status']>('Pendiente');
  
  // Client state
  const [client, setClient] = useState<Partial<Client>>({ name: '', phone: '', address: '' });
  const [clientSearch, setClientSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);

  // Items state
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showProductResults, setShowProductResults] = useState(false);

  // Totals
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function init() {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;

      // Load Settings
      const settingsSnap = await getDoc(doc(db, 'users', userId, 'settings', 'current'));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as BusinessSettings);
      } else {
        setSettings({
          businessName: 'Mi Negocio',
          currency: 'DOP',
          taxPercentage: 18
        });
      }

      // Load Clients & Products for search
      const clientsSnap = await getDocs(collection(db, 'users', userId, 'clients'));
      setAllClients(clientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));

      const productsSnap = await getDocs(collection(db, 'users', userId, 'products'));
      setAllProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

      if (id) {
        // Edit mode
        setLoading(true);
        const invSnap = await getDoc(doc(db, 'users', userId, 'invoices', id));
        if (invSnap.exists()) {
          const data = invSnap.data() as Invoice;
          setInvoiceNumber(data.invoiceNumber);
          setDate(format(data.date.toDate(), 'yyyy-MM-dd'));
          setPaymentType(data.paymentType);
          setClient(data.client);
          setItems(data.items);
          setDiscount(data.discount);
          setStatus(data.status);
        }
        setLoading(false);
      } else {
        // New invoice - get next number
        const invQuery = query(collection(db, 'users', userId, 'invoices'), orderBy('invoiceNumber', 'desc'), limit(1));
        const lastInvSnap = await getDocs(invQuery);
        if (!lastInvSnap.empty) {
          setInvoiceNumber(lastInvSnap.docs[0].data().invoiceNumber + 1);
        } else {
          setInvoiceNumber(1001); // Start at 1001
        }
      }
    }
    init();
  }, [id]);

  useEffect(() => {
    const s = items.reduce((acc, item) => acc + item.subtotal, 0);
    const t = (s - discount) * ((settings?.taxPercentage || 0) / 100);
    setSubtotal(s);
    setTax(t);
    setTotal(s - discount + t);
  }, [items, discount, settings]);

  const addItem = (product?: Product) => {
    if (product) {
      const newItem: InvoiceItem = {
        code: product.code,
        description: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price
      };
      setItems([...items, newItem]);
      setProductSearch('');
      setShowProductResults(false);
    } else {
      setItems([...items, { code: '', description: '', quantity: 1, price: 0, subtotal: 0 }]);
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const nextItems = [...items];
    const item = { ...nextItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'price') {
      item.subtotal = item.quantity * item.price;
    }
    
    nextItems[index] = item;
    setItems(nextItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const saveInvoice = async (printAfter = false) => {
    if (!auth.currentUser) return;
    if (items.length === 0) return alert('Debe agregar al menos un producto');
    if (!client.name) return alert('Debe ingresar el nombre del cliente');

    setLoading(true);
    const userId = auth.currentUser.uid;
    const batch = writeBatch(db);

    const invoiceData: Omit<Invoice, 'id'> = {
      invoiceNumber,
      date: new Date(date),
      paymentType,
      client: {
        name: client.name || '',
        phone: client.phone || '',
        address: client.address || ''
      },
      items,
      subtotal,
      discount,
      tax,
      total,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      let docId = id;
      if (id) {
        // Prepare update data - ONLY fields that should change
        const updateData = {
          date: new Date(date),
          paymentType,
          client: {
            name: client.name || '',
            phone: client.phone || '',
            address: client.address || ''
          },
          items,
          subtotal,
          discount,
          tax,
          total,
          status,
          updatedAt: serverTimestamp()
        };
        batch.update(doc(db, 'users', userId, 'invoices', id), updateData);
      } else {
        const invoiceData: Omit<Invoice, 'id'> = {
          invoiceNumber,
          date: new Date(date),
          paymentType,
          client: {
            name: client.name || '',
            phone: client.phone || '',
            address: client.address || ''
          },
          items,
          subtotal,
          discount,
          tax,
          total,
          status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const newDocRef = doc(collection(db, 'users', userId, 'invoices'));
        docId = newDocRef.id;
        batch.set(newDocRef, invoiceData);

        // Optional: Update stock
        items.forEach(item => {
          const product = allProducts.find(p => p.code === item.code);
          if (product?.id) {
            batch.update(doc(db, 'users', userId, 'products', product.id), {
              stock: increment(-item.quantity)
            });
          }
        });
      }

      await batch.commit();
      
      if (printAfter) {
        window.print();
      } else {
        alert('Factura guardada correctamente');
      }
      
      navigate('/history');
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, `users/${userId}/invoices`);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = allClients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.phone?.includes(clientSearch)
  );

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 overflow-visible">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{id ? 'Editar Factura' : 'Generar Factura'}</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Terminal de Procesamiento v2.5</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => navigate('/history')}
            className="px-5 py-2 text-slate-500 font-bold hover:bg-white rounded border border-transparent hover:border-slate-300 transition-all text-xs uppercase tracking-widest"
          >
            Limpiar
          </button>
          <button 
            onClick={() => saveInvoice(false)}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-300 text-slate-900 rounded font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save size={14} />
            {loading ? '...' : 'PDF / Guardar'}
          </button>
          <button 
             onClick={() => saveInvoice(true)}
             disabled={loading}
            className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white rounded font-black text-xs uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <Printer size={14} />
            GUARDAR E IMPRIMIR
          </button>
        </div>
      </div>

      {/* Invoice Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-paper min-h-[900px] flex flex-col print:shadow-none print:border-none print:p-0"
      >
        {/* Invoice Header */}
        <div className="flex justify-between border-b-2 border-slate-900 pb-10 mb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-slate-900 w-12 h-12 flex items-center justify-center text-white font-black text-xl">FP</div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none uppercase tracking-tighter">
                  {settings?.businessName || 'FacturaPro Shop'}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Servicios Industriales & Comerciales</p>
              </div>
            </div>
            <div className="space-y-1 text-[10px] font-black text-slate-500 uppercase tracking-tight">
              <p className="flex items-center gap-2"><MapPin size={12} className="text-slate-300" /> {settings?.address || 'Dirección General'}</p>
              <p className="flex items-center gap-2"><Phone size={12} className="text-slate-300" /> TEL: {settings?.phone || '809-000-0000'}</p>
            </div>
          </div>

          <div className="text-right flex flex-col justify-between">
            <div className="text-4xl font-black text-slate-400 opacity-20 tracking-widest mb-4">FACTURA</div>
            <div className="space-y-4">
              <div className="flex flex-col items-end">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Folio de Control</label>
                <div className="flex items-center gap-2 font-black text-xl text-slate-900 bg-slate-50 px-3 py-1 border border-slate-200">
                  <span className="text-slate-300">#</span>{invoiceNumber}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha Emisión</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="font-black text-sm text-slate-900 bg-transparent outline-none border-b border-slate-200 hover:border-slate-900 transition-colors text-right"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Client & Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-12">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 Datos del Cliente
              </label>
              <div className="relative print:hidden">
                <button 
                  onClick={() => setShowClientResults(!showClientResults)}
                  className="text-[10px] text-blue-600 font-black uppercase underline hover:text-blue-800"
                >
                  Buscar Registrado
                </button>
                {showClientResults && (
                  <div className="absolute top-full right-0 mt-4 w-64 bg-white border border-slate-200 shadow-2xl z-20 overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        placeholder="Filtrar..." 
                        className="w-full text-xs p-2 bg-slate-50 outline-none font-bold"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredClients.map(c => (
                        <button 
                          key={c.id} 
                          className="w-full text-left px-4 py-3 hover:bg-slate-900 hover:text-white flex flex-col transition-colors border-b border-slate-50 last:border-0"
                          onClick={() => {
                            setClient({ name: c.name, phone: c.phone, address: c.address });
                            setClientSearch('');
                            setShowClientResults(false);
                          }}
                        >
                          <span className="font-bold text-xs uppercase">{c.name}</span>
                          <span className="text-[10px] opacity-60 font-mono italic">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <input 
                placeholder="NOMBRE O RAZÓN SOCIAL" 
                className="w-full bg-transparent font-black text-xl text-slate-900 placeholder:text-slate-200 outline-none border-b border-slate-200 focus:border-slate-900 transition-colors uppercase tracking-tight"
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 font-mono leading-none">Teléfono/WhatsApp</label>
                  <input 
                    placeholder="8XX-XXX-XXXX" 
                    className="w-full bg-transparent outline-none text-xs font-bold text-slate-700 placeholder:text-slate-200 border-b border-slate-100 focus:border-slate-400 py-1"
                    value={client.phone}
                    onChange={(e) => setClient({ ...client, phone: e.target.value })}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 font-mono leading-none">Dirección Fiscal / Entrega</label>
                  <input 
                    placeholder="Calle, Ciudad, País" 
                    className="w-full bg-transparent outline-none text-xs font-bold text-slate-700 placeholder:text-slate-200 border-b border-slate-100 focus:border-slate-400 py-1"
                    value={client.address}
                    onChange={(e) => setClient({ ...client, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modalidad de Pago</label>
                <select 
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 px-3 py-1.5 font-bold text-xs text-slate-700 outline-none appearance-none cursor-pointer uppercase"
                >
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Crédito</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estatus Contable</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className={cn(
                    "w-full px-3 py-1.5 font-black text-xs outline-none appearance-none cursor-pointer uppercase transition-all",
                    status === 'Pagada' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                  )}
                >
                  <option>Pendiente</option>
                  <option>Pagada</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="flex-1 mb-12">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-900">
                <th className="py-2 px-1 text-left text-[10px] font-black text-slate-900 uppercase tracking-tight w-24 leading-none">Cód. Artículo</th>
                <th className="py-2 px-1 text-left text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none">Descripción Detallada</th>
                <th className="py-2 px-1 text-center text-[10px] font-black text-slate-900 uppercase tracking-tight w-24 leading-none">Cantidad</th>
                <th className="py-2 px-1 text-right text-[10px] font-black text-slate-900 uppercase tracking-tight w-32 leading-none">Precio Unit.</th>
                <th className="py-2 px-1 text-right text-[10px] font-black text-slate-900 uppercase tracking-tight w-32 leading-none">Importe</th>
                <th className="py-2 px-1 text-right print:hidden w-10 leading-none"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={index} className="group transition-colors border-b border-slate-200">
                  <td className="py-3 px-1 font-mono text-[11px] font-bold">
                    <input 
                      value={item.code}
                      onChange={(e) => updateItem(index, 'code', e.target.value)}
                      className="bg-transparent border-0 outline-none w-full"
                      placeholder="---"
                    />
                  </td>
                  <td className="py-3 px-1">
                    <input 
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="bg-transparent border-0 outline-none w-full font-bold text-xs uppercase"
                      placeholder="PRODUCTO O SERVICIO..."
                    />
                  </td>
                  <td className="py-3 px-1 text-center">
                    <input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="bg-transparent border-0 outline-none w-16 font-black text-center text-xs"
                    />
                  </td>
                  <td className="py-3 px-1 text-right">
                    <input 
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                      className="bg-transparent border-0 outline-none w-24 font-black text-right text-xs"
                    />
                  </td>
                  <td className="py-3 px-1 text-right font-black text-xs text-slate-900">
                    ${item.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-1 text-right print:hidden">
                    <button 
                      onClick={() => removeItem(index)}
                      className="p-1.5 text-slate-200 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Add New Line print:hidden */}
              <tr className="print:hidden">
                <td colSpan={2} className="py-4 px-1">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="CÓDIGO O NOMBRE DE PRODUCTO..." 
                      className="w-full bg-slate-50 py-2 px-3 text-[10px] font-bold uppercase border border-slate-200 rounded outline-none focus:border-slate-900 transition-colors"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductResults(true);
                      }}
                      onFocus={() => setShowProductResults(true)}
                    />
                    <AnimatePresence>
                      {showProductResults && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 w-80 bg-white border border-slate-200 shadow-2xl z-30 mt-1 max-h-60 overflow-y-auto"
                        >
                          {filteredProducts.map(p => (
                            <button 
                              key={p.id}
                              onClick={() => addItem(p)}
                              className="w-full flex items-center justify-between p-3 hover:bg-slate-900 hover:text-white transition-all text-left border-b border-slate-50 last:border-0"
                            >
                              <div>
                                <p className="font-bold text-[11px] uppercase">{p.name}</p>
                                <p className="text-[9px] opacity-60 font-mono leading-none">COD: {p.code}</p>
                              </div>
                              <span className="font-black text-xs">${p.price}</span>
                            </button>
                          ))}
                          <button 
                            onClick={() => {
                              addItem();
                              setShowProductResults(false);
                            }}
                            className="w-full p-2 text-[10px] font-black bg-slate-100 hover:bg-slate-200 text-slate-500 uppercase tracking-widest text-center"
                          >
                            + Línea Personalizada
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
                <td colSpan={4} className="py-4 px-1 text-right opacity-30 italic text-[10px] font-bold">
                  AUTOGUARDADO ACTIVO EN LA NUBE
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals & Signature */}
        <div className="flex flex-col md:flex-row justify-between items-end mt-auto pt-10 border-t-2 border-slate-900">
          <div className="md:w-64 space-y-8 print:mb-0 mb-10 w-full md:w-auto">
            <div className="text-center w-full">
              <div className="w-full h-[1px] bg-slate-900 mb-2" />
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Firma Autorizada / Sello</p>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight">
              NOTA: LA MERCANCÍA VIAJA POR CUENTA Y RIESGO DEL COMPRADOR. NO SE ACEPTAN DEVOLUCIONES PASADAS LAS 48 HORAS.
            </p>
          </div>

          <div className="md:w-72 w-full space-y-1.5 font-bold uppercase tracking-tight text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Subtotal Artículo(s):</span>
              <span className="text-slate-900">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Descuento Especial:</span>
              <div className="flex items-center gap-1 border-b border-slate-200">
                <span className="text-slate-300">RD$</span>
                <input 
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-20 bg-transparent text-right font-black outline-none py-0.5"
                />
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">ITBIS / IVA ({settings?.taxPercentage || 0}%):</span>
              <span className="text-slate-900">${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-slate-900">
              <span className="text-xl font-black text-slate-900">TOTAL RD$:</span>
              <span className="text-2xl font-black text-slate-900">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Global Footer */}
        <div className="absolute bottom-2 left-10 right-10 flex justify-between text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em] font-mono print:hidden">
          <span>ORIGINAL CLIENTE</span>
          <span>SISTEMA DE FACTURACIÓN INTEGRADO</span>
          <span>VALIDEZ FISCAL</span>
        </div>
      </motion.div>
    </div>
  );
}
