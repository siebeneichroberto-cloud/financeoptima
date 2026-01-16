
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  LogOut, 
  ShieldCheck, 
  TrendingUp,
  Menu,
  X,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  User as UserIcon,
  ChevronRight,
  ChevronDown,
  Building2,
  Calculator,
  Scale
} from 'lucide-react';
import { User, UserRole, Module } from './types';
import { db } from './db';
import UserManagement from './pages/UserManagement';
import Dashboard from './pages/Dashboard';
import FinancialModule from './pages/Finance/FinancialModule';
import InstitutionRegistry from './pages/Finance/InstitutionRegistry';
import AdvanceCalculator from './pages/Finance/AdvanceCalculator';
import OperationComparator from './pages/Finance/OperationComparator';

const Login: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const users = db.getUsers();
      const user = users.find(u => u.email === email && u.password === password);

      if (user) {
        onLogin(user);
      } else {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-[440px] z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-600 w-16 h-16 rounded-2xl mb-6 shadow-2xl shadow-blue-500/40 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <TrendingUp size={36} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">OPTIMA</h1>
          <p className="text-slate-400 font-medium">SaaS de Inteligência Financeira</p>
        </div>

        <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
          <form onSubmit={handleSubmit} className="p-10 space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in slide-in-from-top-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">E-mail de Acesso</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="exemplo@optima.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all placeholder:text-slate-300" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Senha Corporativa</label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all placeholder:text-slate-300" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black text-sm hover:bg-[#1e293b] shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 mt-4 group"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Acessar Plataforma <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
          <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Acesso Restrito • OPTIMA © 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFinanceExpanded, setIsFinanceExpanded] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem('optima_session');
    if (saved) {
      setCurrentUser(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Abre automaticamente se o usuário navegar para uma rota financeira
    if (location.pathname.startsWith('/finance')) {
      setIsFinanceExpanded(true);
    }
  }, [location.pathname]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('optima_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('optima_session');
  };

  const hasPermission = (module: Module) => {
    return currentUser?.role === UserRole.MASTER || currentUser?.permissions.includes(module);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-[#020617] text-white transition-all duration-500 ease-in-out flex flex-col shrink-0 border-r border-slate-800/50 shadow-2xl z-40`}>
        <div className="p-8 flex items-center gap-4 overflow-hidden">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 shrink-0">
            <TrendingUp size={28} />
          </div>
          {isSidebarOpen && <span className="font-black text-2xl tracking-tighter whitespace-nowrap">OPTIMA</span>}
        </div>

        <nav className="flex-1 mt-4 px-4 space-y-2 overflow-y-auto no-scrollbar">
          <SidebarItem to="/" icon={<LayoutDashboard size={22} />} label="Dashboard Principal" isOpen={isSidebarOpen} />
          
          {hasPermission(Module.FINANCE) && (
            <div className="space-y-1">
              <button 
                onClick={() => isSidebarOpen ? setIsFinanceExpanded(!isFinanceExpanded) : (setIsSidebarOpen(true), setIsFinanceExpanded(true))}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${
                  location.pathname.startsWith('/finance') && !isFinanceExpanded
                    ? 'bg-blue-600/20 text-blue-400' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Wallet size={22} className="shrink-0" />
                {isSidebarOpen && (
                  <>
                    <span className="font-bold text-sm tracking-tight flex-1 text-left">Módulo Financeiro</span>
                    {isFinanceExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </>
                )}
              </button>

              {isFinanceExpanded && isSidebarOpen && (
                <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-300">
                  {currentUser.role === UserRole.MASTER && (
                    <SidebarSubItem to="/finance/institutions" icon={<Building2 size={16} />} label="Instituições" />
                  )}
                  <SidebarSubItem to="/finance/calculator" icon={<Calculator size={16} />} label="Simulador" />
                  <SidebarSubItem to="/finance/comparator" icon={<Scale size={16} />} label="Comparador Prev/Real" />
                </div>
              )}
            </div>
          )}

          {currentUser.role === UserRole.MASTER && (
            <SidebarItem to="/admin/users" icon={<ShieldCheck size={22} />} label="Gestão de Acessos" isOpen={isSidebarOpen} />
          )}
        </nav>

        <div className="p-6 border-t border-slate-800/50">
          <div className={`flex items-center gap-4 p-3 ${isSidebarOpen ? 'bg-slate-800/30' : ''} rounded-2xl group transition-all`}>
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-sm font-black uppercase shrink-0 shadow-lg border border-blue-400/20">
              {currentUser.name.substring(0, 2)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate text-white">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.role}</p>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className={`p-2 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition-all ${!isSidebarOpen && 'hidden'}`}
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors border border-slate-100">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade Ativa</span>
              <span className="text-sm font-bold text-slate-900">Operações Centralizadas</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                <UserIcon size={20} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 md:p-12 scroll-smooth">
          <Routes>
            <Route path="/" element={<Dashboard user={currentUser} />} />
            <Route path="/finance/*" element={hasPermission(Module.FINANCE) ? <FinancialModule user={currentUser} /> : <Navigate to="/" />}>
              <Route index element={<Navigate to={currentUser.role === UserRole.MASTER ? "institutions" : "calculator"} />} />
              <Route path="institutions" element={currentUser.role === UserRole.MASTER ? <InstitutionRegistry /> : <Navigate to="/finance/calculator" />} />
              <Route path="calculator" element={<AdvanceCalculator />} />
              <Route path="comparator" element={<OperationComparator />} />
            </Route>
            <Route path="/admin/users" element={currentUser.role === UserRole.MASTER ? <UserManagement /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const SidebarItem: React.FC<{ to: string; icon: React.ReactNode; label: string; isOpen: boolean }> = ({ to, icon, label, isOpen }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${
        isActive 
          ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`}
    >
      <span className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </span>
      {isOpen && <span className="font-bold text-sm tracking-tight">{label}</span>}
      {isActive && isOpen && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-lg" />}
    </Link>
  );
};

const SidebarSubItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'text-white bg-white/10' 
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
    >
      <span className={`shrink-0 ${isActive ? 'text-blue-400' : ''}`}>{icon}</span>
      <span className="text-[13px] font-semibold">{label}</span>
    </Link>
  );
};

export default App;
