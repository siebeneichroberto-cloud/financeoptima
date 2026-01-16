
import React, { useState, useMemo } from 'react';
import { Title, FinancialInstitution, CalculationResult } from '../../types';
import { db } from '../../db';
import { 
  Scale, 
  Trash2, 
  Plus, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  Calendar as CalendarIcon,
  CreditCard,
  Info
} from 'lucide-react';

interface RealizedTitle extends Title {
  realizedNet: number;
}

const OperationComparator: React.FC = () => {
  const institutions = db.getInstitutions();
  const [operationDate, setOperationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedInstId, setSelectedInstId] = useState<string>(institutions[0]?.id || '');
  
  const [titles, setTitles] = useState<RealizedTitle[]>([
    { id: '1', payer: '', invoiceNumber: '', value: 0, dueDate: '', realizedNet: 0 }
  ]);

  const selectedInstitution = useMemo(() => 
    institutions.find(i => i.id === selectedInstId) || institutions[0]
  , [selectedInstId, institutions]);

  // Lógica de Feriados e Cálculo (Reaproveitada para consistência)
  const holidaysCache = useMemo(() => {
    const year = new Date(operationDate).getFullYear();
    // Simplificado para o exemplo, em produção usaria a mesma util do calculator
    return []; 
  }, [operationDate]);

  const isBusinessDay = (date: Date): boolean => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  const getSettlementDate = (dueDate: Date, workingDaysFloat: number): Date => {
    let result = new Date(dueDate);
    while (!isBusinessDay(result)) result.setDate(result.getDate() + 1);
    let added = 0;
    while (added < workingDaysFloat) {
      result.setDate(result.getDate() + 1);
      if (isBusinessDay(result)) added++;
    }
    return result;
  };

  const results = useMemo(() => {
    const opDate = new Date(operationDate);
    const inst = selectedInstitution;
    if (!inst) return [];

    return titles.map(title => {
      const dueDate = new Date(title.dueDate);
      if (isNaN(dueDate.getTime()) || title.value <= 0) {
        return { ...title, predictedNet: 0, diff: 0 };
      }

      const settlementDate = getSettlementDate(dueDate, inst.workingDaysFloat || 0);
      const diffTotalMs = settlementDate.getTime() - opDate.getTime();
      const calculationDays = Math.max(Math.round(diffTotalMs / (1000 * 60 * 60 * 24)), inst.minDays || 0);
      
      const dailyRate = (inst.monthlyRate / 100) / 30;
      const discount = title.value * dailyRate * calculationDays;
      const adValorem = title.value * (inst.adValorem / 100);
      const iof = (title.value * (inst.iofFixed / 100)) + (title.value * (inst.iofDaily / 100) * Math.min(calculationDays, 365));
      const fees = inst.ticketFee + inst.serasaFee + inst.signatureFee;
      
      const predictedNet = title.value - (discount + adValorem + iof + fees);
      const diff = title.realizedNet > 0 ? title.realizedNet - predictedNet : 0;

      return { ...title, predictedNet, diff };
    });
  }, [titles, operationDate, selectedInstitution]);

  const totals = useMemo(() => {
    return results.reduce((acc, curr) => ({
      gross: acc.gross + curr.value,
      predicted: acc.predicted + curr.predictedNet,
      realized: acc.realized + curr.realizedNet,
      diff: acc.diff + curr.diff
    }), { gross: 0, predicted: 0, realized: 0, diff: 0 });
  }, [results]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data Borderô</label>
                <input 
                  type="date" 
                  value={operationDate} 
                  onChange={e => setOperationDate(e.target.value)} 
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Instituição</label>
                <select 
                  value={selectedInstId} 
                  onChange={e => setSelectedInstId(e.target.value)} 
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
                >
                  {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale size={18} className="text-blue-600" /> Auditoria de Títulos (Previsto vs Borderô)
            </h4>
            
            <div className="space-y-4">
              {titles.map((title) => (
                <div key={title.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200 hover:border-blue-200 transition-all">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pagador</label>
                    <input type="text" value={title.payer} onChange={e => setTitles(titles.map(t => t.id === title.id ? {...t, payer: e.target.value} : t))} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500/10" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bruto (R$)</label>
                    <input type="number" step="0.01" value={title.value || ''} onChange={e => setTitles(titles.map(t => t.id === title.id ? {...t, value: parseFloat(e.target.value) || 0} : t))} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vencimento</label>
                    <input type="date" value={title.dueDate} onChange={e => setTitles(titles.map(t => t.id === title.id ? {...t, dueDate: e.target.value} : t))} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10" />
                  </div>
                  <div className="md:col-span-3 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Líquido Real (Borderô)</label>
                    <input type="number" step="0.01" value={title.realizedNet || ''} onChange={e => setTitles(titles.map(t => t.id === title.id ? {...t, realizedNet: parseFloat(e.target.value) || 0} : t))} className="w-full px-3 py-1.5 bg-white text-blue-700 border border-blue-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-center">
                    <button onClick={() => titles.length > 1 && setTitles(titles.filter(t => t.id !== title.id))} className="mb-1 p-2 text-slate-300 hover:text-rose-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => setTitles([...titles, { id: Date.now().toString(), payer: '', invoiceNumber: '', value: 0, dueDate: '', realizedNet: 0 }])} 
                className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-400 text-slate-400 hover:text-blue-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-2 bg-white"
              >
                <Plus size={20} /> Adicionar Título ao Comparador
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 sticky top-20">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-blue-400">
              <TrendingDown size={20} /> Análise de Discrepância
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-400 text-sm">
                <span>Total Bruto</span>
                <span className="font-semibold text-white">R$ {formatBRL(totals.gross)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-sm">
                <span>Líquido Previsto (Sistema)</span>
                <span className="font-semibold text-white">R$ {formatBRL(totals.predicted)}</span>
              </div>
              <div className="flex justify-between items-center text-blue-400 text-sm font-bold">
                <span>Líquido Realizado (Borderô)</span>
                <span className="font-bold">R$ {formatBRL(totals.realized)}</span>
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-slate-300 font-medium uppercase text-[10px] tracking-widest">Diferença Total (Delta)</span>
                    <p className={`text-[9px] italic ${totals.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totals.diff >= 0 ? 'Cobrança menor que o previsto' : 'Atenção: Cobrança maior que o previsto'}
                    </p>
                  </div>
                  <p className={`text-2xl font-black ${totals.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {formatBRL(totals.diff)}
                  </p>
                </div>
              </div>
            </div>
            
            {Math.abs(totals.diff) > 0.01 && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${totals.diff < 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                {totals.diff < 0 ? <AlertTriangle className="text-rose-400 shrink-0" size={20} /> : <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {totals.diff < 0 
                    ? `A factory creditou R$ ${formatBRL(Math.abs(totals.diff))} a menos do que o calculado. Verifique se houve alteração de taxas ou custos extras no borderô.`
                    : `Operação vantajosa! O crédito foi R$ ${formatBRL(totals.diff)} maior que o previsto em sistema.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Scale size={18} className="text-blue-600" /> Detalhamento por Título
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr className="text-slate-500 font-bold uppercase whitespace-nowrap">
                <th className="px-4 py-4">Pagador</th>
                <th className="px-4 py-4 text-right">Bruto</th>
                <th className="px-4 py-4 text-right bg-slate-200/30">Previsto (Sistema)</th>
                <th className="px-4 py-4 text-right bg-blue-50">Realizado (Borderô)</th>
                <th className="px-4 py-4 text-right">Diferença (Delta)</th>
                <th className="px-4 py-4 text-center">Status Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                  <td className="px-4 py-3 font-bold text-slate-700 uppercase">{item.payer || '---'}</td>
                  <td className="px-4 py-3 text-right">R$ {formatBRL(item.value)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-500 bg-slate-200/10">R$ {formatBRL(item.predictedNet)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700 bg-blue-50/30">R$ {formatBRL(item.realizedNet)}</td>
                  <td className={`px-4 py-3 text-right font-black ${item.diff < -0.01 ? 'text-rose-600' : item.diff > 0.01 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    R$ {formatBRL(item.diff)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.realizedNet === 0 ? (
                      <span className="text-[10px] text-slate-400 font-bold italic">Aguardando Borderô</span>
                    ) : Math.abs(item.diff) < 0.05 ? (
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">CONCILIADO</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.diff < 0 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.diff < 0 ? 'DIVERGENTE (-)' : 'DIVERGENTE (+)'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OperationComparator;
