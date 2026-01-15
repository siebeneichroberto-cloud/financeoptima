
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Building2, Calculator } from 'lucide-react';
import { User, UserRole } from '../../types';

interface FinancialModuleProps {
  user: User;
}

const FinancialModule: React.FC<FinancialModuleProps> = ({ user }) => {
  const location = useLocation();

  const allTabs = [
    { to: '/finance/institutions', label: 'Instituições', icon: <Building2 size={18} />, masterOnly: true },
    { to: '/finance/calculator', label: 'Antecipação de Títulos', icon: <Calculator size={18} />, masterOnly: false },
  ];

  // Filtra as abas baseado no papel do usuário
  const visibleTabs = allTabs.filter(tab => !tab.masterOnly || user.role === UserRole.MASTER);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Módulo Financeiro</h1>
          <p className="text-slate-500 text-sm">
            {user.role === UserRole.MASTER 
              ? 'Configuração de taxas e cálculo de antecipação.' 
              : 'Cálculo e simulação de antecipação de títulos.'}
          </p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto no-scrollbar">
        {visibleTabs.map(tab => {
          const active = location.pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative ${
                active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </Link>
          );
        })}
      </div>

      <div className="animate-in fade-in duration-300">
        <Outlet />
      </div>
    </div>
  );
};

export default FinancialModule;
