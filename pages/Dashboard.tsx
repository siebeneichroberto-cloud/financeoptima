
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { User, UserRole, Operation, FinancialInstitution, CalculationResult, ExtraFee } from '../types';
import { db } from '../db';
import { 
  Wallet, 
  TrendingUp, 
  Activity, 
  Clock, 
  Trash2, 
  Eye, 
  X, 
  FileText, 
  Download, 
  Filter, 
  Percent,
  Paperclip,
  Upload,
  CheckCircle2,
  ExternalLink,
  Info,
  ChevronRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [institutions, setInstitutions] = useState<FinancialInstitution[]>([]);
  const [filterInst, setFilterInst] = useState<string>('all');
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOperations(db.getOperations());
    setInstitutions(db.getInstitutions());
  }, []);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const handleDeleteOperation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (user.role !== UserRole.MASTER) {
      alert('Apenas usuários MASTER podem excluir operações.');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir esta operação permanentemente?')) {
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
    const totalFees = totalGross - totalNet;
    const avgTaxPercent = totalGross > 0 ? (totalFees / totalGross) * 100 : 0;
    return [
      { label: 'Fluxo Mensal', value: filteredOperations.length.toString(), icon: <Activity className="text-blue-600" />, color: "bg-blue-50" },
      { label: 'Volume Bruto', value: `R$ ${formatBRL(totalGross)}`, icon: <Wallet className="text-indigo-600" />, color: "bg-indigo-50" },
      { label: 'Taxa Média', value: `${avgTaxPercent.toFixed(2)}%`, icon: <Percent className="text-emerald-600" />, color: "bg-emerald-50" },
      { label: 'Líquido Médio', value: `R$ ${formatBRL(avgNet)}`, icon: <TrendingUp className="text-blue-700" />, color: "bg-blue-50" },
    ];
  }, [filteredOperations]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Executivo</h1>
          <p className="text-slate-500 font-medium mt-1">Bem-vindo de volta, {user.name}.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm pr-4">
          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg"><Filter size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instituição</span>
            <select 
              value={filterInst} 
              onChange={(e) => setFilterInst(e.target.value)} 
              className="bg-transparent text-slate-900 text-sm font-bold outline-none cursor-pointer pr-4"
            >
              <option value="all">Todas as Contas</option>
              {institutions.map(inst => <option key={inst.id} value={inst.name}>{inst.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color} opacity-20 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110`}></div>
            <div className="flex items-center justify-between mb-6 relative">
              <div className={`p-4 ${stat.color} rounded-2xl`}>{stat.icon}</div>
            </div>
            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest relative">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-900 mt-2 tracking-tighter relative">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white">
          <h2 className="text-xl font-black flex items-center gap-3 text-slate-900 uppercase tracking-tight">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Histórico de Operações
          </h2>
          <button className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] hover:bg-blue-50 px-6 py-3 rounded-2xl transition-all">Ver Relatório Completo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-10 py-6">Data Ref.</th>
                <th className="px-10 py-6">Instituição</th>
                <th className="px-10 py-6 text-right">Volume Bruto</th>
                <th className="px-10 py-6 text-right">Crédito Líquido</th>
                <th className="px-10 py-6 text-right">Custo Efetivo</th>
                <th className="px-10 py-6 text-center">Status</th>
                <th className="px-10 py-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOperations.map(op => {
                const feePercent = op.grossTotal > 0 ? ((op.grossTotal - op.netTotal) / op.grossTotal) * 100 : 0;
                return (
                  <tr key={op.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => setSelectedOp(op)}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Clock size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-600">{new Date(op.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 font-black text-slate-900 text-sm tracking-tight">{op.institutionName}</td>
                    <td className="px-10 py-6 text-right text-sm font-bold text-slate-500">R$ {formatBRL(op.grossTotal)}</td>
                    <td className="px-10 py-6 text-right font-black text-blue-600 text-sm">R$ {formatBRL(op.netTotal)}</td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-[11px] font-black px-3 py-1 rounded-lg ${feePercent > 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {feePercent.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <div className="flex items-center justify-center">
                        {op.attachment ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase">
                            <CheckCircle2 size={12} /> Conciliado
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase">
                            <Info size={12} /> Pendente
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                          <Eye size={18} />
                        </button>
                        {user.role === UserRole.MASTER && (
                          <button 
                            onClick={(e) => handleDeleteOperation(op.id, e)} 
                            className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredOperations.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                <FileText size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhuma operação registrada</h3>
              <p className="text-slate-400 mt-2 font-medium">As operações de antecipação filtradas aparecerão aqui.</p>
            </div>
          )}
        </div>
      </div>

      {selectedOp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/80 backdrop-blur-xl p-4 overflow-y-auto">
          <div className="bg-white rounded-[48px] w-full max-w-6xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-auto border border-white/20">
            <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3 mb-1">
                   <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><FileText size={20} /></div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Detalhes da Operação</h3>
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest ml-11">Ref: {selectedOp.id} • {selectedOp.institutionName}</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-8 py-4 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl">
                  <Download size={16} /> Exportar Auditoria
                </button>
                <button onClick={() => setSelectedOp(null)} className="p-4 bg-white text-slate-400 hover:text-slate-900 rounded-2xl border border-slate-200 shadow-sm transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-12 space-y-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Document Section */}
              <div className="bg-slate-900 rounded-[32px] p-10 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full translate-x-32 -translate-y-32 blur-3xl transition-transform group-hover:scale-125"></div>
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Borderô de Antecipação Digital</h4>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Auditado em {new Date(selectedOp.date).toLocaleDateString()}</span>
                  </div>

                  {selectedOp.attachment ? (
                    <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                          <Paperclip size={32} />
                        </div>
                        <div>
                          <p className="text-lg font-black tracking-tight">{selectedOp.attachment.name}</p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">Documento validado via sistema</p>
                        </div>
                      </div>
                      <button className="px-8 py-4 bg-white text-slate-900 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2">
                        <ExternalLink size={16} /> Visualizar Original
                      </button>
                    </div>
                  ) : (
                    <div className="p-10 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-blue-500/40 hover:bg-white/5 transition-all cursor-pointer">
                       <Upload size={40} className="text-slate-600" />
                       <div className="text-center">
                          <p className="text-sm font-bold">Anexar Cópia do Borderô</p>
                          <p className="text-[10px] text-slate-500 uppercase mt-1">Sincronize o documento oficial da instituição</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: "Volume Total", val: `R$ ${formatBRL(selectedOp.grossTotal)}`, col: "text-slate-900" },
                  { label: "Taxas Aplicadas", val: `R$ ${formatBRL(selectedOp.grossTotal - selectedOp.netTotal)}`, col: "text-rose-600" },
                  { label: "Outros Custos", val: `R$ ${formatBRL(selectedOp.details?.extraFeesTotal || 0)}`, col: "text-amber-600" },
                  { label: "Crédito Líquido", val: `R$ ${formatBRL(selectedOp.netTotal)}`, col: "text-blue-600" }
                ].map((s, idx) => (
                  <div key={idx} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                    <p className={`text-xl font-black ${s.col} mt-2 tracking-tighter`}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Table titles */}
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50/80">
                    <tr className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                      <th className="px-8 py-5">Cliente/Pagador</th>
                      <th className="px-8 py-5">Documento</th>
                      <th className="px-8 py-5 text-right">Valor Bruto</th>
                      <th className="px-8 py-5 text-center">Prazo Médio</th>
                      <th className="px-8 py-5 text-right">Encargos</th>
                      <th className="px-8 py-5 text-right font-black">Líquido Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedOp.details?.results.map((res: CalculationResult) => (
                      <tr key={res.titleId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-900 uppercase truncate max-w-[200px]">{res.payer}</td>
                        <td className="px-8 py-5 text-slate-500 font-medium">NF {res.invoiceNumber}</td>
                        <td className="px-8 py-5 text-right font-bold">R$ {formatBRL(res.grossValue)}</td>
                        <td className="px-8 py-5 text-center">
                          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-black">{res.calculationDays}d</span>
                        </td>
                        <td className="px-8 py-5 text-right text-rose-500 font-bold">R$ {formatBRL(res.discountValue + res.iofValue + res.adValoremValue)}</td>
                        <td className="px-8 py-5 text-right font-black text-blue-600 text-sm tracking-tight">R$ {formatBRL(res.netValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
