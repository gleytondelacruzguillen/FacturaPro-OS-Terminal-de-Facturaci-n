import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  History, 
  Users, 
  Package, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  FileText,
  CreditCard,
  ChevronRight,
  TrendingUp,
  PackageCheck,
  UserCheck,
  Calculator
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import InvoiceHistory from './components/InvoiceHistory';
import ClientManager from './components/ClientManager';
import ProductManager from './components/ProductManager';
import Reports from './components/Reports';
import SettingsPage from './components/SettingsPage';

function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (o: boolean) => void }) {
  const location = useLocation();

  const menuItems = [
    { name: 'Historial', icon: History, path: '/history' },
    { name: 'Clientes', icon: Users, path: '/clients' },
    { name: 'Productos', icon: Package, path: '/products' },
    { name: 'Reportes', icon: BarChart3, path: '/reports' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={cn(
          "fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white z-50 transition-all duration-300 transform lg:translate-x-0 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-black tracking-tight uppercase flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-[10px] font-black">FP</span>
              FactuPronto
            </h1>
          </div>

          <div className="flex-1 py-6 flex flex-col px-4">
            <div className="mb-8">
              <Link
                to="/invoice/new"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 rounded-lg font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-95 text-xs uppercase tracking-widest"
              >
                <PlusCircle size={18} />
                Nueva Factura
              </Link>
            </div>

            <nav className="space-y-1">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 transition-all duration-200 text-xs font-bold uppercase tracking-widest border-l-4",
                  location.pathname === '/'
                    ? "bg-slate-800 border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <TrendingUp size={16} />
                Dashboard
              </Link>
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 transition-all duration-200 text-xs font-bold uppercase tracking-widest border-l-4",
                    location.pathname === item.path
                      ? "bg-slate-800 border-blue-500 text-blue-400"
                      : "border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <item.icon size={16} />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="p-6 border-t border-slate-800 space-y-4">
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-colors",
                location.pathname === '/settings' ? "text-blue-400" : "text-slate-500 hover:text-white"
              )}
            >
              <Settings size={14} />
              Configuración
            </Link>
            
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-12 shadow-2xl border border-slate-300 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-2 h-full bg-slate-900" />
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-slate-900 w-12 h-12 flex items-center justify-center text-white font-black text-xl">FP</div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none uppercase tracking-tighter">FactuPronto</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Geometric Accounting</p>
          </div>
        </div>

        <div className="space-y-6 mb-10">
          <h2 className="text-xl font-bold text-slate-900">Bienvenido de nuevo</h2>
          <p className="text-sm text-slate-500 leading-relaxed font-semibold">
            Acceda a su terminal de facturación segura. Gestión comercial simplificada con estándares geométricos.
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-4 active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-0 invert" alt="Google" />
          Ingresar al Sistema
        </button>

        <div className="mt-12 flex items-center justify-between text-[10px] text-slate-400 uppercase font-black tracking-tighter pt-8 border-t border-slate-100">
          <span>v2.5.0 Stable</span>
          <span>Google Verification Required</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Test connection
        getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
      }
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-200 flex overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        <main className="flex-1 lg:ml-64 flex flex-col h-screen overflow-hidden">
          <header className="bg-slate-100 border-b border-slate-300 px-8 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 lg:hidden text-slate-900 hover:bg-slate-200 rounded transition-colors"
              >
                <Menu size={24} />
              </button>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter hidden sm:block">Terminal Administrativa</h2>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Operador</p>
                <p className="text-xs font-bold text-slate-900">{user.displayName}</p>
              </div>
              <div className="relative group">
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-9 h-9 rounded-sm border border-slate-300 shadow-sm group-hover:scale-105 transition-transform cursor-pointer" 
                />
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/invoice/new" element={<InvoiceForm />} />
                <Route path="/invoice/edit/:id" element={<InvoiceForm />} />
                <Route path="/history" element={<InvoiceHistory />} />
                <Route path="/clients" element={<ClientManager />} />
                <Route path="/products" element={<ProductManager />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
              
              <footer className="mt-12 py-8 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                <span>FactuPronto System v2.5.0_geometric</span>
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Conexión Segura Establecida
                </span>
                <span>RD_{new Date().getFullYear()}</span>
              </footer>
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
}
