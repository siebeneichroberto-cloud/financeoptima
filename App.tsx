
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  LogOut, 
  ShieldCheck, 
  TrendingUp,
  Menu,
  X
} from 'lucide-react';
import { User, UserRole, Module } from './types';
import { db } from './db';
import UserManagement from './pages/UserManagement';
import Dashboard from './pages/Dashboard';
import FinancialModule from './pages/Finance/FinancialModule';
import InstitutionRegistry from './pages/Finance/InstitutionRegistry';
import AdvanceCalculator from './pages/Finance/AdvanceCalculator';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(db.getUsers()[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const hasPermission = (module: Module) => {
    return currentUser.role === UserRole.MASTER || currentUser.permissions.includes(module);
  };

  return (
    <HashRouter>
      <div className="min-h-screen flex bg-slate-50">
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col shrink-0`}>
          <div className="p-6 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp size={24} />
            </div>
            {isSidebarOpen && <span className="font-bold text-xl tracking-tight">Optima</span>}
          </div>

          <nav className="flex-1 mt-6 px-4 space-y-2">
            <SidebarItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" isOpen={isSidebarOpen} />
            {hasPermission(Module.FINANCE) && (
              <SidebarItem to="/finance" icon={<Wallet size={20} />} label="Financeiro" isOpen={isSidebarOpen} />
            )}
            {currentUser.role === UserRole.MASTER && (
              <SidebarItem to="/admin/users" icon={<ShieldCheck size={20} />} label="Gestão de Acesso" isOpen={isSidebarOpen} />
            )}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-2 py-3 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold uppercase">
                {currentUser.name.substring(0, 2)}
              </div>
              {isSidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
                </div>
              )}
              <LogOut size={18} className="text-slate-400 group-hover:text-white" />
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-md text-slate-600">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="hidden sm:inline">Bem-vindo, {currentUser.name}</span>
              <div className="w-px h-4 bg-slate-200 mx-2" />
              <button className="text-blue-600 font-medium">Banco de Dados Ativo</button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard user={currentUser} />} />
              <Route path="/finance/*" element={hasPermission(Module.FINANCE) ? <FinancialModule user={currentUser} /> : <Navigate to="/" />}>
                <Route index element={<Navigate to={currentUser.role === UserRole.MASTER ? "institutions" : "calculator"} />} />
                <Route path="institutions" element={currentUser.role === UserRole.MASTER ? <InstitutionRegistry /> : <Navigate to="/finance/calculator" />} />
                <Route path="calculator" element={<AdvanceCalculator />} />
              </Route>
              <Route path="/admin/users" element={currentUser.role === UserRole.MASTER ? <UserManagement /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

const SidebarItem: React.FC<{ to: string; icon: React.ReactNode; label: string; isOpen: boolean }> = ({ to, icon, label, isOpen }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link to={to} className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      <span className="shrink-0">{icon}</span>
      {isOpen && <span className="font-medium whitespace-nowrap">{label}</span>}
    </Link>
  );
};

export default App;
