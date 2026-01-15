
import React, { useMemo, useState, useEffect } from 'react';
import { User, Operation, FinancialInstitution, CalculationResult } from '../types';
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
  ChevronDown,
  Eye,
  X,
  FileText,
  Table as TableIcon,
  RefreshCcw,
  Calendar as CalendarIcon,
  Building2,
  Download
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

  useEffect(() => {
    setOperations(db.getOperations());
    setInstitutions(db.getInstitutions());
  }, []);

  const handleDeleteOperation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    const totalFees = totalGross - totalNet;
    const avgTaxPercent = totalGross > 0 ? (totalFees / totalGross) * 100 : 0;
    return [
      { label: 'Operações Filtradas', value: filteredOperations.length.toString(), icon: <TrendingUp className="text-emerald-500" /> },
      { label: 'Volume Bruto', value: `R$ ${totalGross.toLocaleString('pt-BR')}`, icon: <Wallet className="text-blue-500" /> },
      { label: 'Custo Efetivo Médio', value: `${avgTaxPercent.toFixed(2)}%`, icon: <Percent className="text-rose-500" />, sub: 'Total / Bruto' },
      { label: 'Ticket Médio (Líq)', value: `R$ ${avgNet.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: <Activity className="text-orange-500" /> },
    ];
  }, [filteredOperations]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const handleExportHistoricalPDF = (opData: Operation) => {
    setIsExporting(true);
    setTimeout(() => {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const blue = [37, 99, 235];
      const dark = [30, 41, 59];
      const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      // HEADER
      doc.setFillColor(dark[0], dark[1], dark[2]);
      doc.rect(0, 0, 297, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('OPTIMA', 15, 25);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('RELATÓRIO HISTÓRICO DE ANTECIPAÇÃO', 15, 32);
      doc.text(`GERADO EM: ${new Date().toLocaleString('pt-BR')}`, 282, 15, { align: 'right' });
      doc.text(`ID OPERAÇÃO: ${opData.id}`, 282, 22, { align: 'right' });

      // INFO
      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES DA OPERAÇÃO', 15, 52);
      doc.setFont('helvetica', 'normal');
      doc.text(`Instituição: ${opData.institutionName}`, 15, 58);
      doc.text(`Referência: ${formatDateDisplay(opData.referenceDate)}`, 15, 63);

      // SUMMARY
      (doc as any).autoTable({
        startY: 70,
        head: [['VOLUME BRUTO', 'DEDUÇÕES TOTAIS', 'RECOMPRAS', 'CRÉDITO LÍQUIDO']],
        body: [[
          formatCurrency(opData.grossTotal),
          formatCurrency(opData.grossTotal - opData.netTotal - (opData.details?.repurchaseTotal || 0)),
          formatCurrency(opData.details?.repurchaseTotal || 0),
          formatCurrency(opData.netTotal)
        ]],
        theme: 'grid',
        headStyles: { fillColor: blue, textColor: 255, fontSize: 10, halign: 'center', fontStyle: 'bold' },
        bodyStyles: { fontSize: 14, halign: 'center', fontStyle: 'bold', textColor: blue },
        margin: { left: 15, right: 15 }
      });

      // TABLE
      const tableData = opData.details?.results.map((item: CalculationResult) => [
        item.payer?.toUpperCase(),
        item.invoiceNumber,
        formatDateDisplay(item.dueDate),
        formatCurrency(item.grossValue),
        `${item.days}/${item.calculationDays}d`,
        formatCurrency(item.discountValue + item.iofValue + item.adValoremValue),
        formatCurrency(item.ticketFeeValue + item.serasaFeeValue + item.signatureFeeValue),
        formatCurrency(item.netValue)
      ]) || [];

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Pagador', 'Nota', 'Venc.', 'Bruto', 'Prazo', 'Deságio/IOF', 'Taxas Tít.', 'Líquido']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
        styles: { fontSize: 7 },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right', fontStyle: 'bold' } }
      });

      doc.save(`Historico_Optima_${opData.institutionName}_${opData.id}.pdf`);
      setIsExporting(false);
    }, 500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá, {user.name}</h1>
          <p className="text-slate-500 text-sm">Histórico de antecipações e análise de custos.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-3 text-slate-400"><Filter size={16} /><span className="text-xs font-bold uppercase tracking-wider">Filtrar:</span></div>
          <div className="relative">
            <select value={filterInst} onChange={(e) => setFilterInst(e.target.value)} className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 block w-full pl-3 pr-10 py-2 outline-none cursor-pointer font-medium">
              <option value="all">Todas Instituições</option>
              {institutions.map(inst => <option key={inst.id} value={inst.name}>{inst.name}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4"><div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">{stat.icon}</div></div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Clock size={20} className="text-blue-600" /> Histórico de Operações</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr><th className="px-6 py-4">Data</th><th className="px-6 py-4">Instituição</th><th className="px-6 py-4 text-right">Bruto</th><th className="px-6 py-4 text-right">Líquido</th><th className="px-6 py-4 text-right">Custo (%)</th><th className="px-6 py-4 text-center">Títulos</th><th className="px-6 py-4 text-center">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOperations.map(op => {
                  const feePercent = op.grossTotal > 0 ? ((op.grossTotal - op.netTotal) / op.grossTotal) * 100 : 0;
                  return (
                    <tr key={op.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedOp(op)}>
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(op.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{op.institutionName}</td>
                      <td className="px-6 py-4 text-right text-sm text-slate-500">R$ {op.grossTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">R$ {op.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${feePercent > 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{feePercent.toFixed(2)}%</span></td>
                      <td className="px-6 py-4 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-medium">{op.titlesCount}</span></td>
                      <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1"><button className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Eye size={16} /></button><button onClick={(e) => handleDeleteOperation(op.id, e)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-fit">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><Activity size={20} className="text-blue-600" /> Insights Rápidos</h2>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
            <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">Clique em qualquer operação da lista para visualizar o detalhamento analítico completo e exportar o relatório PDF profissional.</p>
          </div>
        </div>
      </div>

      {selectedOp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight"><FileText className="text-blue-600" /> Detalhamento da Operação</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">ID: <span className="text-blue-600 font-mono">{selectedOp.id}</span> | Realizada em {new Date(selectedOp.date).toLocaleString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleExportHistoricalPDF(selectedOp)} 
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isExporting ? <RefreshCcw size={14} className="animate-spin" /> : <Download size={14} />}
                  Exportar PDF
                </button>
                <button onClick={() => setSelectedOp(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all"><X size={24} /></button>
              </div>
            </div>

            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Instituição</p><p className="text-lg font-bold text-slate-900 flex items-center gap-2"><Building2 size={16} className="text-blue-600"/> {selectedOp.institutionName}</p></div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Referência (Data)</p><p className="text-lg font-bold text-slate-900 flex items-center gap-2"><CalendarIcon size={16} className="text-blue-600"/> {selectedOp.referenceDate ? new Date(selectedOp.referenceDate).toLocaleDateString('pt-BR') : '--/--/----'}</p></div>
                <div className="bg-blue-600 p-4 rounded-xl shadow-lg shadow-blue-500/20"><p className="text-[10px] font-bold text-blue-100 uppercase mb-1">Líquido Creditado</p><p className="text-2xl font-black text-white">R$ {selectedOp.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100"><p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Custo da Operação</p><p className="text-xl font-bold text-rose-600">R$ {selectedOp.discountTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between"><h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><TableIcon size={18} className="text-blue-600" /> Títulos Antecipados</h4><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-600 rounded uppercase">{selectedOp.titlesCount} unidades</span></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100/50"><tr className="text-slate-500 font-bold uppercase whitespace-nowrap border-b border-slate-200"><th className="px-4 py-3">Pagador</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3 text-right">Bruto</th><th className="px-4 py-3 text-center">Dias (R/C)</th><th className="px-4 py-3 text-right text-rose-500">Deságio/IOF</th><th className="px-4 py-3 text-right text-emerald-600">Taxas Título</th><th className="px-4 py-3 text-right font-bold">Líquido Individual</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOp.details?.results.map((res: CalculationResult) => (
                        <tr key={res.titleId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-slate-700 uppercase truncate max-w-[150px]">{res.payer || '---'}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-mono">{res.invoiceNumber || '---'}</td>
                          <td className="px-4 py-2.5 text-slate-600">{res.dueDate ? new Date(res.dueDate).toLocaleDateString('pt-BR') : '---'}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">R$ {res.grossValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2.5 text-center text-slate-400">{res.days}/{res.calculationDays}d</td>
                          <td className="px-4 py-2.5 text-right text-rose-500/80">R$ {(res.discountValue + res.iofValue + res.adValoremValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-700/80">R$ {(res.ticketFeeValue + res.serasaFeeValue + res.signatureFeeValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-blue-700 bg-blue-50/20">R$ {res.netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {((selectedOp.details?.repurchaseItems?.length || 0) > 0 || (selectedOp.details?.fixedFees || 0) > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {(selectedOp.details?.repurchaseItems?.length || 0) > 0 && (
                    <div className="bg-amber-50/30 rounded-xl border border-amber-100 overflow-hidden">
                      <div className="p-4 border-b border-amber-100 flex items-center justify-between"><h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 uppercase tracking-tighter"><RefreshCcw size={18} className="text-amber-600" /> Títulos Recomprados</h4></div>
                      <div className="p-0 overflow-x-auto"><table className="w-full text-left text-[10px]"><thead className="bg-amber-100/50"><tr><th className="px-4 py-2 uppercase text-amber-700 font-bold">Pagador</th><th className="px-4 py-2 text-right uppercase text-amber-700 font-bold">Bruto</th><th className="px-4 py-2 text-right uppercase text-amber-700 font-bold">Encargos</th><th className="px-4 py-2 text-right uppercase text-amber-700 font-bold">Total Recompra</th></tr></thead><tbody className="divide-y divide-amber-100">
                        {selectedOp.details?.repurchaseItems.map((rep: any) => (
                          <tr key={rep.id}><td className="px-4 py-2 font-medium truncate max-w-[120px] uppercase">{rep.payer}</td><td className="px-4 py-2 text-right">R$ {rep.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="px-4 py-2 text-right text-rose-500">+ R$ {rep.totalFeesPerItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="px-4 py-2 text-right font-bold">R$ {rep.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
                        ))}
                      </tbody></table></div>
                    </div>
                  )}
                  <div className="bg-slate-900 rounded-xl p-6 text-white space-y-4">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><Percent size={14} /> Detalhamento de Deduções</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center text-slate-400"><span>Deságio/IOF/AdV. Total:</span><span className="text-white">R$ {(selectedOp.details?.totals.discount + selectedOp.details?.totals.iof + selectedOp.details?.totals.advalorem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between items-center text-slate-400"><span>Custos p/ Título (Bol/Ser/Assin):</span><span className="text-white">R$ {(selectedOp.details?.totals.ticket + selectedOp.details?.totals.serasa + selectedOp.details?.totals.signature).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between items-center text-slate-400"><span>Custos Fixos (TAC/Transf):</span><span className="text-white">R$ {(selectedOp.details?.fixedFees || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                      {selectedOp.details?.repurchaseTotal > 0 && (<div className="flex justify-between items-center text-amber-400 font-bold border-t border-slate-800 pt-2"><span>Dedução de Recompras:</span><span>R$ {selectedOp.details?.repurchaseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>)}
                      <div className="flex justify-between items-center text-blue-400 font-black text-lg border-t border-slate-700 pt-4 mt-2"><span>CRÉDITO LÍQUIDO:</span><span>R$ {selectedOp.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
