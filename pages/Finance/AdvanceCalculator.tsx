
import React, { useState, useMemo } from 'react';
import { Title, FinancialInstitution, Operation, CalculationResult, ExtraFee } from '../../types';
import { db } from '../../db';
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  CreditCard,
  TrendingDown, 
  Table as TableIcon, 
  RefreshCcw, 
  FileText,
  Wallet,
  AlertCircle,
  PlusCircle,
  Info,
  History,
  Receipt
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Funções Utilitárias para Automação de Feriados
const getEaster = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const getBrazilHolidays = (year: number) => {
  const easter = getEaster(year);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const fixed = [
    `${year}-01-01`, // Confraternização Universal
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Dia do Trabalho
    `${year}-09-07`, // Independência
    `${year}-10-12`, // Nossa Sra Aparecida
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proclamação da República
    `${year}-11-20`, // Dia de Zumbi (Nacional)
    `${year}-12-25`, // Natal
  ];

  const mobile = [
    formatDate(addDays(easter, -48)), // Segunda de Carnaval
    formatDate(addDays(easter, -47)), // Terça de Carnaval
    formatDate(addDays(easter, -2)),  // Sexta-feira da Paixão
    formatDate(addDays(easter, 60)),  // Corpus Christi
  ];

  return [...fixed, ...mobile];
};

const AdvanceCalculator: React.FC = () => {
  const institutions = db.getInstitutions();
  const [operationDate, setOperationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedInstId, setSelectedInstId] = useState<string>(institutions[0]?.id || '');
  
  const [titles, setTitles] = useState<Title[]>([
    { id: '1', payer: 'SANTANA TEXTIL S.A', invoiceNumber: '---', value: 12049.47, dueDate: '2026-02-27' }
  ]);

  const [repurchaseTitles, setRepurchaseTitles] = useState<Title[]>([]);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [newExtraFee, setNewExtraFee] = useState({ description: '', value: 0 });

  const [savedStatus, setSavedStatus] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const holidaysCache = useMemo(() => {
    const startYear = new Date(operationDate).getFullYear() || new Date().getFullYear();
    const years = [startYear - 1, startYear, startYear + 1, startYear + 2, startYear + 3, startYear + 4, startYear + 5];
    return years.flatMap(y => getBrazilHolidays(y));
  }, [operationDate]);

  const selectedInstitution = useMemo(() => 
    institutions.find(i => i.id === selectedInstId) || institutions[0]
  , [selectedInstId, institutions]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date(NaN);
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  const isBusinessDay = (date: Date): boolean => {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    const dateStr = date.toISOString().split('T')[0];
    return !holidaysCache.includes(dateStr);
  };

  const getSettlementDate = (dueDate: Date, workingDaysFloat: number): Date => {
    let result = new Date(dueDate);
    while (!isBusinessDay(result)) {
      result.setDate(result.getDate() + 1);
    }
    let added = 0;
    while (added < workingDaysFloat) {
      result.setDate(result.getDate() + 1);
      if (isBusinessDay(result)) {
        added++;
      }
    }
    return result;
  };

  const results: CalculationResult[] = useMemo(() => {
    const opDate = parseLocalDate(operationDate);
    const inst = selectedInstitution;
    if (!inst) return [];

    return titles.map(title => {
      const dueDate = parseLocalDate(title.dueDate);
      if (isNaN(dueDate.getTime()) || isNaN(opDate.getTime()) || title.value <= 0) {
        return { 
          titleId: title.id, payer: title.payer, invoiceNumber: title.invoiceNumber, dueDate: title.dueDate, 
          grossValue: title.value, netValue: 0, discountValue: 0, adValoremValue: 0, iofValue: 0, 
          ticketFeeValue: 0, serasaFeeValue: 0, signatureFeeValue: 0, days: 0, calculationDays: 0
        };
      }

      const diffNominalMs = dueDate.getTime() - opDate.getTime();
      const actualDays = Math.max(0, Math.round(diffNominalMs / (1000 * 60 * 60 * 24)));
      const settlementDate = getSettlementDate(dueDate, inst.workingDaysFloat || 0);
      const diffTotalMs = settlementDate.getTime() - opDate.getTime();
      const totalElapsedDays = Math.round(diffTotalMs / (1000 * 60 * 60 * 24));
      const calculationDays = Math.max(totalElapsedDays, inst.minDays || 0);
      
      const dailyRate = (inst.monthlyRate / 100) / 30;
      const discountValue = title.value * dailyRate * calculationDays;
      const adValoremValue = title.value * (inst.adValorem / 100);
      const iofValue = (title.value * (inst.iofFixed / 100)) + (title.value * (inst.iofDaily / 100) * Math.min(calculationDays, 365));
      const totalDiscountsPerTitle = discountValue + adValoremValue + iofValue + inst.ticketFee + inst.serasaFee + inst.signatureFee;
      
      return { 
        titleId: title.id, payer: title.payer, invoiceNumber: title.invoiceNumber, dueDate: title.dueDate,
        grossValue: title.value, netValue: title.value - totalDiscountsPerTitle, 
        discountValue, adValoremValue, iofValue, 
        ticketFeeValue: inst.ticketFee, serasaFeeValue: inst.serasaFee, signatureFeeValue: inst.signatureFee,
        days: actualDays, calculationDays: calculationDays
      };
    });
  }, [titles, operationDate, selectedInstitution, holidaysCache]);

  const totals = useMemo(() => {
    return results.reduce((acc, curr) => ({
      gross: acc.gross + curr.grossValue,
      net: acc.net + curr.netValue,
      discount: acc.discount + curr.discountValue,
      advalorem: acc.advalorem + curr.adValoremValue,
      iof: acc.iof + curr.iofValue,
      ticket: acc.ticket + curr.ticketFeeValue,
      serasa: acc.serasa + curr.serasaFeeValue,
      signature: acc.signature + curr.signatureFeeValue,
    }), { gross: 0, net: 0, discount: 0, advalorem: 0, iof: 0, ticket: 0, serasa: 0, signature: 0 });
  }, [results]);

  const repurchaseData = useMemo(() => {
    const opDate = parseLocalDate(operationDate);
    const inst = selectedInstitution;
    const dailyRepurchaseRate = ((inst?.repurchaseRate || 0) / 100) / 30;
    const penaltyRate = (inst?.repurchasePenalty || 0) / 100;
    const dailyMoraRate = ((inst?.repurchaseMora || 0) / 100) / 30;
    
    const items = repurchaseTitles.map(t => {
      const dueDate = parseLocalDate(t.dueDate);
      const daysLate = isNaN(dueDate.getTime()) ? 0 : Math.max(0, Math.ceil((opDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      const interestFee = t.value * dailyRepurchaseRate * daysLate;
      const penaltyFee = daysLate > 0 ? t.value * penaltyRate : 0;
      const moraFee = t.value * dailyMoraRate * daysLate;
      const totalFeesPerItem = interestFee + penaltyFee + moraFee;
      return { ...t, daysLate, interestFee, penaltyFee, moraFee, totalFeesPerItem, total: t.value + totalFeesPerItem };
    });
    
    const totalValue = items.reduce((acc, curr) => acc + curr.value, 0);
    const totalFees = items.reduce((acc, curr) => acc + curr.totalFeesPerItem, 0);
    return { items, totalValue, totalFees, grandTotal: totalValue + totalFees };
  }, [repurchaseTitles, selectedInstitution, operationDate]);

  const extraFeesTotal = useMemo(() => extraFees.reduce((acc, curr) => acc + curr.value, 0), [extraFees]);
  const fixedFees = (selectedInstitution?.tac || 0) + (selectedInstitution?.transferFee || 0);
  const finalNet = totals.net - fixedFees - repurchaseData.grandTotal - extraFeesTotal;

  const handleSaveToDB = () => {
    if (finalNet <= 0 || !selectedInstitution) return;
    const newOp: Operation = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      referenceDate: operationDate,
      institutionName: selectedInstitution.name,
      grossTotal: totals.gross,
      netTotal: finalNet,
      discountTotal: totals.gross - finalNet,
      titlesCount: titles.length,
      details: { 
        results, 
        repurchaseItems: repurchaseData.items, 
        repurchaseTotal: repurchaseData.grandTotal, 
        fixedFees, 
        extraFees,
        extraFeesTotal,
        totals,
        workingDaysFloat: selectedInstitution.workingDaysFloat 
      }
    };
    db.saveOperation(newOp);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const handleAddExtraFee = () => {
    if (newExtraFee.description && newExtraFee.value > 0) {
      setExtraFees([...extraFees, { id: Date.now().toString(), ...newExtraFee }]);
      setNewExtraFee({ description: '', value: 0 });
    }
  };

  const generateProfessionalPDF = (opData: any, inst: FinancialInstitution) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const blue = [37, 99, 235];
    const dark = [30, 41, 59];
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

    doc.setFillColor(dark[0], dark[1], dark[2]);
    doc.rect(0, 0, 297, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('OPTIMA', 15, 25);
    doc.setFontSize(9);
    doc.text('RELATÓRIO DE ANTECIPAÇÃO DE TÍTULOS', 15, 32);

    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFontSize(10);
    doc.text(`Instituição: ${inst.name} | Operação: ${formatDateDisplay(operationDate)} | Float: ${inst.workingDaysFloat}u`, 15, 55);

    (doc as any).autoTable({
      startY: 65,
      head: [['VOLUME BRUTO', 'DEDUÇÕES TOTAIS', 'TAXAS EXTRAS', 'CRÉDITO LÍQUIDO']],
      body: [[
        formatCurrency(totals.gross),
        formatCurrency(totals.gross - finalNet - extraFeesTotal),
        formatCurrency(extraFeesTotal),
        formatCurrency(finalNet)
      ]],
      theme: 'grid',
      headStyles: { fillColor: blue, textColor: 255, fontSize: 10, halign: 'center', fontStyle: 'bold' },
      bodyStyles: { fontSize: 14, halign: 'center', fontStyle: 'bold', textColor: blue }
    });

    const tableData = results.map((item: any) => [
      item.payer?.toUpperCase() || '---',
      item.invoiceNumber || '---',
      formatDateDisplay(item.dueDate),
      formatCurrency(item.grossValue),
      `${item.calculationDays} dias`,
      formatCurrency(item.discountValue + item.iofValue + item.adValoremValue),
      formatCurrency(item.ticketFeeValue + item.serasaFeeValue + item.signatureFeeValue),
      formatCurrency(item.netValue)
    ]);

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Pagador', 'Nota', 'Venc.', 'Bruto', 'Prazo Total', 'Deságio/IOF', 'Taxas Tít.', 'Líquido']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right', fontStyle: 'bold' } }
    });

    doc.save(`Antecipacao_Optima_${inst.name.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Container principal com items-start para permitir o sticky funcional */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Seção 1: Configuração Básica */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <CalendarIcon size={14} /> Data da Operação
                </label>
                <input type="date" value={operationDate} onChange={e => setOperationDate(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <CreditCard size={14} /> Instituição de Crédito
                </label>
                <select value={selectedInstId} onChange={e => setSelectedInstId(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                  {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Seção 2: Títulos para Antecipar */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wallet size={18} className="text-blue-600" /> Títulos para Antecipar
              </h4>
            </div>
            <div className="space-y-4">
              {titles.map((title) => (
                <div key={title.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200 group hover:border-blue-200 transition-all">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pagador</label>
                    <input type="text" placeholder="Nome do Cliente" value={title.payer} onChange={e => setTitles(titles.map(t => t.id === title.id ? {...t, payer: e.target.value} : t))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none uppercase" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nota/NFe</label>
                    <input type="text" placeholder="Número" value={title.invoiceNumber} onChange={e => setTitles(titles.map(t => t.id === title.id ? {...t, invoiceNumber: e.target.value} : t))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Bruto</label>
                    <input type="number" step="0.01" value={title.value} onChange={e => setTitles(titles.map(t => t.id === title.id ? {...t, value: parseFloat(e.target.value) || 0} : t))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vencimento</label>
                    <input type="date" value={title.dueDate} onChange={e => setTitles(titles.map(t => t.id === title.id ? {...t, dueDate: e.target.value} : t))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-center">
                    <button onClick={() => titles.length > 1 && setTitles(titles.filter(t => t.id !== title.id))} className="mb-1 p-2 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => setTitles([...titles, { id: Date.now().toString(), payer: '', invoiceNumber: '', value: 0, dueDate: '' }])} 
                className="w-full py-3 border-2 border-dashed border-blue-100 hover:border-blue-400 text-blue-500 hover:text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all bg-blue-50/30 hover:bg-blue-50 mt-2"
              >
                <Plus size={20} /> Adicionar Novo Título
              </button>
            </div>
          </div>

          {/* Seção 3: Títulos para Recompra */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History size={18} className="text-rose-600" /> Títulos para Recompra
              </h4>
            </div>
            
            <div className="space-y-4">
              {repurchaseTitles.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-6 rounded-xl text-center border border-dashed border-slate-200">Nenhum título selecionado para recompra.</p>
              ) : (
                repurchaseTitles.map((title) => (
                  <div key={title.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-rose-50/20 rounded-xl border border-rose-100 group">
                    <div className="md:col-span-5">
                      <label className="block text-[10px] font-bold text-rose-400 uppercase mb-1">Pagador</label>
                      <input type="text" placeholder="Nome" value={title.payer} onChange={e => setRepurchaseTitles(repurchaseTitles.map(t => t.id === title.id ? {...t, payer: e.target.value} : t))} className="w-full px-3 py-1.5 bg-white border border-rose-100 rounded-lg text-sm outline-none uppercase" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-rose-400 uppercase mb-1">Valor</label>
                      <input type="number" step="0.01" value={title.value} onChange={e => setRepurchaseTitles(repurchaseTitles.map(t => t.id === title.id ? {...t, value: parseFloat(e.target.value) || 0} : t))} className="w-full px-3 py-1.5 bg-white border border-rose-100 rounded-lg text-sm outline-none" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-rose-400 uppercase mb-1">Venc. Original</label>
                      <input type="date" value={title.dueDate} onChange={e => setRepurchaseTitles(repurchaseTitles.map(t => t.id === title.id ? {...t, dueDate: e.target.value} : t))} className="w-full px-3 py-1.5 bg-white border border-rose-100 rounded-lg text-sm outline-none" />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-center">
                      <button onClick={() => setRepurchaseTitles(repurchaseTitles.filter(t => t.id !== title.id))} className="mb-1 p-2 text-rose-300 hover:text-rose-600"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              )}

              <button 
                onClick={() => setRepurchaseTitles([...repurchaseTitles, { id: Date.now().toString(), payer: '', invoiceNumber: '', value: 0, dueDate: '' }])} 
                className="w-full py-3 border-2 border-dashed border-rose-100 hover:border-rose-400 text-rose-500 hover:text-rose-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all bg-rose-50/30 hover:bg-rose-50"
              >
                <Plus size={20} /> Adicionar Título para Recompra
              </button>
            </div>
          </div>

          {/* Seção 4: Taxas Extras Manuais */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt size={18} className="text-indigo-600" /> Taxas e Despesas Manuais
            </h4>
            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Descrição da taxa (ex: Registro em Cartório)" 
                value={newExtraFee.description} 
                onChange={e => setNewExtraFee({...newExtraFee, description: e.target.value})} 
                className="flex-1 px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
              <input 
                type="number" 
                placeholder="Valor (R$)" 
                value={newExtraFee.value || ''} 
                onChange={e => setNewExtraFee({...newExtraFee, value: parseFloat(e.target.value) || 0})} 
                className="w-full md:w-32 px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
              <button onClick={handleAddExtraFee} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"><Plus size={16} /> Adicionar</button>
            </div>
            
            {extraFees.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {extraFees.map(fee => (
                  <div key={fee.id} className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center shadow-sm">
                    <span className="text-xs font-medium text-slate-700">{fee.description}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-700">R$ {formatBRL(fee.value)}</span>
                      <button onClick={() => setExtraFees(extraFees.filter(f => f.id !== fee.id))} className="text-indigo-300 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumo Lateral Flutuante (Sticky) */}
        <div className="lg:col-span-1 sticky top-20 z-20">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl border border-slate-700 space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar transition-all duration-300 hover:shadow-blue-500/10">
            <h3 className="text-lg font-bold flex items-center gap-2 text-blue-400">
              <TrendingDown size={20} /> Resumo da Operação
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-400 text-sm">
                <span>Volume Bruto (Antecipar)</span>
                <span className="font-semibold text-white">R$ {formatBRL(totals.gross)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-sm">
                <span>Encargos (Taxa/IOF/AdV)</span>
                <span className="text-rose-400">- R$ {formatBRL(totals.discount + totals.iof + totals.advalorem)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-sm">
                <span>Tarifas Operacionais</span>
                <span className="text-rose-400">- R$ {formatBRL(totals.ticket + totals.serasa + totals.signature + fixedFees)}</span>
              </div>

              {repurchaseData.grandTotal > 0 && (
                <div className="flex justify-between items-center text-rose-300 text-sm font-medium pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1"><History size={12} /> Recompra Total</span>
                  <span className="text-rose-400">- R$ {formatBRL(repurchaseData.grandTotal)}</span>
                </div>
              )}
              
              {extraFeesTotal > 0 && (
                <div className="flex justify-between items-center text-indigo-300 text-sm font-medium">
                  <span className="flex items-center gap-1"><Receipt size={12} /> Taxas Manuais</span>
                  <span className="text-indigo-400">- R$ {formatBRL(extraFeesTotal)}</span>
                </div>
              )}

              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-slate-300 font-medium uppercase text-[10px] tracking-widest">Crédito Líquido</span>
                    <p className="text-[9px] text-slate-500 italic">Pronto para TED</p>
                  </div>
                  <p className="text-2xl font-black text-blue-400">
                    R$ {formatBRL(finalNet)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button 
                onClick={() => generateProfessionalPDF({}, selectedInstitution)} 
                disabled={isExporting}
                className="py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs border border-white/5 transition-all active:scale-95 disabled:opacity-50"
              >
                {isExporting ? <RefreshCcw size={16} className="animate-spin" /> : <FileText size={16} />} PDF Completo
              </button>
              <button onClick={handleSaveToDB} disabled={savedStatus || finalNet <= 0} className={`py-3 text-xs ${savedStatus ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold rounded-xl shadow-lg transition-all active:scale-95`}>
                {savedStatus ? 'Salvo!' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grade de Cálculo Inferior */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <TableIcon size={20} className="text-blue-600" /> Grade de Cálculo Inteligente
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            CALENDÁRIO FEBRABAN AUTOMATIZADO (FIXO + MÓVEL)
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr className="text-slate-500 font-bold uppercase whitespace-nowrap">
                <th className="px-4 py-4">Pagador</th>
                <th className="px-4 py-4">Vencimento</th>
                <th className="px-4 py-4 text-right">Bruto</th>
                <th className="px-4 py-4 text-center bg-blue-50/30">Prazo de Cálculo (Corridos)</th>
                <th className="px-4 py-4 text-right text-rose-500">Encargos</th>
                <th className="px-4 py-4 text-right text-emerald-600">Taxas</th>
                <th className="px-4 py-4 text-right bg-blue-50/50">Líquido Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((item) => (
                <tr key={item.titleId} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                  <td className="px-4 py-3 font-bold text-slate-700 uppercase truncate max-w-[150px]">{item.payer || '---'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateDisplay(item.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">R$ {formatBRL(item.grossValue)}</td>
                  <td className="px-4 py-3 text-center bg-blue-50/10">
                    <div className="flex flex-col items-center">
                      <span className="text-blue-700 font-black text-sm">{item.calculationDays} dias</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">(Considerando Feriados/Carnaval)</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-rose-500/80 font-medium">R$ {formatBRL(item.discountValue + item.iofValue + item.adValoremValue)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">R$ {formatBRL(item.ticketFeeValue + item.serasaFeeValue + item.signatureFeeValue)}</td>
                  <td className="px-4 py-3 text-right bg-blue-50/30 font-bold text-blue-700 border-l border-slate-100 text-sm">R$ {formatBRL(item.netValue)}</td>
                </tr>
              ))}
            </tbody>
            {/* Linha de Totais Inferior */}
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr className="font-black text-slate-900 whitespace-nowrap uppercase tracking-tighter">
                <td colSpan={2} className="px-4 py-4 text-right">Totais Consolidados:</td>
                <td className="px-4 py-4 text-right border-x border-slate-200 bg-slate-100/50">R$ {formatBRL(totals.gross)}</td>
                <td className="px-4 py-4 text-center text-slate-400">---</td>
                <td className="px-4 py-4 text-right text-rose-600 border-x border-slate-200">R$ {formatBRL(totals.discount + totals.iof + totals.advalorem)}</td>
                <td className="px-4 py-4 text-right text-emerald-700 border-x border-slate-200">R$ {formatBRL(totals.ticket + totals.serasa + totals.signature)}</td>
                <td className="px-4 py-4 text-right bg-blue-600 text-white shadow-inner">R$ {formatBRL(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvanceCalculator;
