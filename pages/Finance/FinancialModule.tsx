
import React from 'react';
import { Outlet } from 'react-router-dom';
import { User } from '../../types';

interface FinancialModuleProps {
  user: User;
}

const FinancialModule: React.FC<FinancialModuleProps> = ({ user }) => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Módulo Financeiro</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-8 h-1 bg-blue-600 rounded-full" />
          <p className="text-slate-500 font-medium text-sm">Controle granular de taxas e auditoria operacional.</p>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
        <Outlet />
      </div>
    </div>
  );
};

export default FinancialModule;
