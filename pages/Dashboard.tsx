
import React, { useMemo, useState, useEffect } from 'react';
import { User, Operation, FinancialInstitution } from '../types';
import { db } from '../db';
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  Activity, 
  Clock, 
  Trash2, 
  Info, 
  Percent, 
  Filter,
  ChevronDown
} from 'lucide-react';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [institutions, setInstitutions] = useState<FinancialInstitution[]>([]);
  const [filterInst, setFilterInst] = useState<string>('all');
  const users = db.getUsers();

  useEffect(() => {
    setOperations(db.getOperations());
    setInstitutions(db.getInstitutions());
  }, []);

  const handleDeleteOperation = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta operação do histórico? Esta ação não pode ser desfeita.')) {
      db.deleteOperation(id);
      setOperations(db.getOperations());
    }
  };

  const filteredOperations = useMemo(() => {
    if (filterInst === 'all') return operations;
    return operations.filter(op => op.institutionName === filterInst);
  }, [operations, filterInst]);

  const stats = useMemo(() => {
    const totalGross = filteredOperations.reduce((acc, op) => acc + op.grossTotal, 0);
    const totalNet = filteredOperations.reduce((acc, op) => acc + op.netTotal, 0);
    const avgNet = filteredOperations.length > 0 ? totalNet / filteredOperations.length : 0;
    
    // Custo Médio Percentual: (Bruto - Líquido) / Bruto
    const totalFees = totalGross - totalNet;
    const avgTaxPercent = totalGross > 0 ? (totalFees / totalGross) * 100 : 0;
    
    return [
      { label: 'Operações Filtradas', value: filteredOperations.length.toString(), icon: <TrendingUp className="text-emerald-500" /> },
      { label: 'Volume Bruto', value: `R$ ${totalGross.toLocaleString('pt-BR')}`, icon: <Wallet className="text-blue-500" /> },
      { label: 'Custo Efetivo Médio', value: `${avgTaxPercent.toFixed(2)}%`, icon: <Percent className="text-rose-500" />, sub: 'Taxas totais / Bruto' },
      { label: 'Ticket Médio (Líq)', value: `R$ ${avgNet.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: <Activity className="text-orange-500" /> },
    ];
  }, [filteredOperations]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá, {user.name}</h1>
          <p className="text-slate-500 text-sm">Visão geral das antecipações e custos operacionais.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-3 text-slate-400">
            <Filter size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Filtrar Instituição:</span>
          </div>
          <div className="relative">
            <select 
              value={filterInst} 
              onChange={(e) => setFilterInst(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-10 py-2 outline-none transition-all cursor-pointer font-medium"
            >
              <option value="all">Todas as Instituições</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.name}>{inst.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">{stat.icon}</div>
              {stat.sub && <span className="text-[10px] font-bold text-slate-400 uppercase">{stat.sub}</span>}
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              Histórico de Operações {filterInst !== 'all' && <span className="text-blue-600 text-sm">- {filterInst}</span>}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{filteredOperations.length} registros</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Instituição</th>
                  <th className="px-6 py-4 text-right">Bruto</th>
                  <th className="px-6 py-4 text-right">Líquido</th>
                  <th className="px-6 py-4 text-right">Custo (%)</th>
                  <th className="px-6 py-4 text-center">Títulos</th>
                  <th className="px-6 py-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOperations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Nenhum cálculo encontrado para este filtro.</td>
                  </tr>
                ) : (
                  filteredOperations.map(op => {
                    const feePercent = op.grossTotal > 0 ? ((op.grossTotal - op.netTotal) / op.grossTotal) * 100 : 0;
                    return (
                      <tr key={op.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(op.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{op.institutionName}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-500">R$ {op.grossTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right font-bold text-blue-600">R$ {op.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${feePercent > 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {feePercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-medium">{op.titlesCount}</span></td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleDeleteOperation(op.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Excluir operação"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-fit">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            Insights do Filtro
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Instituição Ativa</span>
              <span className="font-bold text-slate-900 truncate max-w-[120px]">{filterInst === 'all' ? 'Todas' : filterInst}</span>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-bold uppercase">Volume Total</span>
                <span className="text-sm font-bold text-slate-900">
                  R$ {filteredOperations.reduce((acc, op) => acc + op.grossTotal, 0).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-[70%]" />
              </div>
              <p className="text-[10px] text-slate-400 italic">Volume bruto acumulado no período filtrado.</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
              <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                {filterInst === 'all' 
                  ? "Você está visualizando a média consolidada de todas as instituições financeiras cadastradas." 
                  : `Análise específica para ${filterInst}. Compare o custo médio desta instituição com o mercado.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
