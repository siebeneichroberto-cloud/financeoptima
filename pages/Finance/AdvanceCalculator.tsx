
import React, { useState, useMemo } from 'react';
import { Title, FinancialInstitution, Operation, CalculationResult } from '../../types';
import { db } from '../../db';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Download, 
  Calendar as CalendarIcon, 
  AlertCircle,
  CreditCard,
  Save, 
  CheckCircle, 
  TrendingDown, 
  Table as TableIcon, 
  Info, 
  RefreshCcw, 
  History, 
  FileText,
  Wallet 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const AdvanceCalculator: React.FC = () => {
  const institutions = db.getInstitutions();
  const [operationDate, setOperationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedInstId, setSelectedInstId] = useState<string>(institutions[0]?.id || '');
  
  // Lista de Antecipação
  const [titles, setTitles] = useState<Title[]>([
    { id: '1', payer: 'CLIENTE EXEMPLO LTDA', invoiceNumber: '1024/A', value: 5000, dueDate: '' }
  ]);

  // Lista de Recompra
  const [repurchaseTitles, setRepurchaseTitles] = useState<Title[]>([]);

  const [savedStatus, setSavedStatus] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectedInstitution = useMemo(() => 
    institutions.find(i => i.id === selectedInstId) || institutions[0]
  , [selectedInstId, institutions]);

  // Helper para formatar data sem sofrer com fuso horário (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Helper para converter string de data em objeto Date local sem shift de fuso
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date(NaN);
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  // Resultados dos Títulos de Antecipação
  const results: CalculationResult[] = useMemo(() => {
    const opDate = parseLocalDate(operationDate);
    const inst = selectedInstitution;
    if (!inst) return [];

    return titles.map(title => {
      const dueDate = parseLocalDate(title.dueDate);

      if (isNaN(dueDate.getTime()) || isNaN(opDate.getTime()) || title.value <= 0) {
        return { 
          titleId: title.id, payer: title.payer, invoiceNumber: title.invoiceNumber, dueDate: title.dueDate, 
          grossValue: title.value, netValue: 0, discountValue: 0, adValoremValue: 0, iofValue: 0, days: 0, calculationDays: 0
        };
      }
      
      // Diferença de dias desconsiderando o dia da operação (Contagem Padrão Financeira)
      const diffInMs = dueDate.getTime() - opDate.getTime();
      const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
      const actualDays = diffInDays >= 0 ? diffInDays : 0;
      
      const calculationDays = Math.max(actualDays, inst.minDays || 0);
      const dailyRate = (inst.monthlyRate / 100) / 30;
      const discountValue = title.value * (1 - (1 / Math.pow(1 + dailyRate, calculationDays)));
      const adValoremValue = title.value * (inst.adValorem / 100);
      const iofValue = (title.value * (inst.iofFixed / 100)) + (title.value * (inst.iofDaily / 100) * Math.min(calculationDays, 365));
      const netPerTitle = title.value - discountValue - adValoremValue - iofValue;
      
      return { 
        titleId: title.id, payer: title.payer, invoiceNumber: title.invoiceNumber, dueDate: title.dueDate,
        grossValue: title.value, netValue: netPerTitle, discountValue, adValoremValue, iofValue, days: actualDays, calculationDays: calculationDays
      };
    });
  }, [titles, operationDate, selectedInstitution]);

  const totals = useMemo(() => {
    return results.reduce((acc, curr) => ({
      gross: acc.gross + curr.grossValue,
      net: acc.net + curr.netValue,
      discount: acc.discount + curr.discountValue,
      advalorem: acc.advalorem + curr.adValoremValue,
      iof: acc.iof + curr.iofValue,
    }), { gross: 0, net: 0, discount: 0, advalorem: 0, iof: 0 });
  }, [results]);

  // Cálculo de Recompra (Incluindo Multa e Mora)
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
      const total = t.value + totalFeesPerItem;

      return {
        ...t,
        daysLate,
        interestFee,
        penaltyFee,
        moraFee,
        totalFeesPerItem,
        total
      };
    });

    const totalValue = items.reduce((acc, curr) => acc + curr.value, 0);
    const totalFees = items.reduce((acc, curr) => acc + curr.totalFeesPerItem, 0);
    const grandTotal = totalValue + totalFees;

    return { items, totalValue, totalFees, grandTotal };
  }, [repurchaseTitles, selectedInstitution, operationDate]);

  const totalTicketFees = (selectedInstitution?.ticketFee || 0) * titles.length;
  const finalNet = totals.net - (selectedInstitution?.tac || 0) - (selectedInstitution?.transferFee || 0) - totalTicketFees - repurchaseData.grandTotal;

  const handleSaveToDB = () => {
    if (finalNet <= 0 || !selectedInstitution) return;
    const newOp: Operation = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      institutionName: selectedInstitution.name,
      grossTotal: totals.gross,
      netTotal: finalNet,
      discountTotal: totals.discount + (totals.gross - totals.net),
      titlesCount: titles.length
    };
    db.saveOperation(newOp);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const handleExportPDF = async () => {
    if (!selectedInstitution) return;
    setIsExporting(true);
    
    try {
      const doc = new jsPDF();
      const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      // Header
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('Optima', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Data da Operação: ${formatDateDisplay(operationDate)}`, 14, 28);
      doc.text(`Instituição: ${selectedInstitution.name}`, 14, 33);
      doc.text(`Relatório Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 38);

      // Summary Box
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 45, 182, 50, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 45, 182, 50, 'S');

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO FINANCEIRO', 20, 54);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`(+) Volume Antecipação:`, 20, 62);
      doc.text(formatCurrency(totals.gross), 85, 62, { align: 'right' });

      doc.text(`(-) Taxas Antecipação:`, 20, 68);
      const opFees = (totals.gross - totals.net) + totalTicketFees + (selectedInstitution.tac || 0) + (selectedInstitution.transferFee || 0);
      doc.text(`- ${formatCurrency(opFees)}`, 85, 68, { align: 'right' });

      if (repurchaseData.grandTotal > 0) {
        doc.text(`(-) Total Recompras:`, 20, 74);
        doc.text(`- ${formatCurrency(repurchaseData.grandTotal)}`, 85, 74, { align: 'right' });
        doc.setFontSize(7);
        doc.text(`(Face: ${formatCurrency(repurchaseData.totalValue)} | Juros/Multa/Mora: ${formatCurrency(repurchaseData.totalFees)})`, 20, 78);
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('LÍQUIDO A RECEBER:', 125, 65);
      doc.text(formatCurrency(finalNet), 125, 75);

      // Tables
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text('Títulos de Antecipação', 14, 108);

      const tableData = results.map(item => [
        item.payer || '---',
        item.invoiceNumber || '---',
        formatDateDisplay(item.dueDate),
        formatCurrency(item.grossValue),
        `${item.days}/${item.calculationDays}d`,
        formatCurrency(item.discountValue + item.iofValue + item.adValoremValue),
        formatCurrency(item.netValue)
      ]);

      (doc as any).autoTable({
        startY: 112,
        head: [['Pagador', 'Nota', 'Venc.', 'Bruto', 'Prazo', 'Descontos', 'Líquido']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold' }
        }
      });

      if (repurchaseTitles.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(12);
        doc.text('Títulos de Recompra (Deduções)', 14, finalY + 15);

        const repurchaseTableData = repurchaseData.items.map(item => [
          item.payer || '---',
          formatDateDisplay(item.dueDate),
          `${item.daysLate}d`,
          formatCurrency(item.value),
          formatCurrency(item.interestFee + item.moraFee),
          formatCurrency(item.penaltyFee),
          formatCurrency(item.total)
        ]);

        (doc as any).autoTable({
          startY: finalY + 19,
          head: [['Pagador', 'Venc. Orig.', 'Atraso', 'Valor Face', 'Juros/Mora', 'Multa', 'Subtotal']],
          body: repurchaseTableData,
          theme: 'striped',
          headStyles: { fillColor: [217, 119, 6] },
          styles: { fontSize: 8 },
          columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' }
          }
        });
      }

      doc.save(`Relatorio_Operacao_${selectedInstitution.name.replace(/\s+/g, '_')}_${operationDate}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao exportar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const updateTitle = (id: string, field: keyof Title, value: any) => {
    setTitles(titles.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const updateRepurchaseTitle = (id: string, field: keyof Title, value: any) => {
    setRepurchaseTitles(repurchaseTitles.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <CalendarIcon size={14} /> Data de Referência
                </label>
                <input type="date" value={operationDate} onChange={e => setOperationDate(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <CreditCard size={14} /> Banco / Fundo Selecionado
                </label>
                <select value={selectedInstId} onChange={e => setSelectedInstId(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                  {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Wallet size={18} className="text-blue-600" />
                  Antecipação de Títulos
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px]">{titles.length}</span>
                </h4>
                <button onClick={() => setTitles([...titles, { id: Date.now().toString(), payer: '', invoiceNumber: '', value: 0, dueDate: '' }])} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline transition-all"><Plus size={16} /> Adicionar Título</button>
              </div>
              <div className="space-y-4">
                {titles.map((title) => (
                  <div key={title.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200 group transition-all hover:border-blue-200">
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pagador</label>
                      <input type="text" placeholder="Razão Social" value={title.payer} onChange={e => updateTitle(title.id, 'payer', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none uppercase" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nota</label>
                      <input type="text" placeholder="Nº NF-e" value={title.invoiceNumber} onChange={e => updateTitle(title.id, 'invoiceNumber', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor</label>
                      <input type="number" step="0.01" placeholder="0,00" value={title.value} onChange={e => updateTitle(title.id, 'value', parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vencimento</label>
                      <input type="date" value={title.dueDate} onChange={e => updateTitle(title.id, 'dueDate', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-center">
                      <button onClick={() => titles.length > 1 && setTitles(titles.filter(t => t.id !== title.id))} className="mb-1 p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <RefreshCcw size={18} className="text-amber-600" />
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Dedução por Recompra (Títulos em Atraso)</h4>
                  <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[10px]">{repurchaseTitles.length}</span>
                </div>
                <button onClick={() => setRepurchaseTitles([...repurchaseTitles, { id: Date.now().toString(), payer: '', invoiceNumber: '', value: 0, dueDate: '' }])} className="text-amber-600 text-sm font-bold flex items-center gap-1 hover:underline transition-all"><Plus size={16} /> Adicionar Recompra</button>
              </div>
              <div className="space-y-4">
                {repurchaseTitles.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-xl text-center text-slate-400 text-xs italic">Nenhum título para recompra.</div>
                ) : (
                  repurchaseTitles.map((title) => {
                    const itemData = repurchaseData.items.find(i => i.id === title.id);
                    return (
                      <div key={title.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-amber-50/20 rounded-xl border border-amber-100 group transition-all hover:border-amber-200">
                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-bold text-amber-500 uppercase mb-1">Pagador</label>
                          <input type="text" placeholder="Nome" value={title.payer} onChange={e => updateRepurchaseTitle(title.id, 'payer', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-amber-200 rounded-lg text-sm focus:border-amber-500 outline-none uppercase" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-amber-500 uppercase mb-1">Vencimento Original</label>
                          <input type="date" value={title.dueDate} onChange={e => updateRepurchaseTitle(title.id, 'dueDate', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-amber-200 rounded-lg text-sm focus:border-amber-500 outline-none" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-amber-500 uppercase mb-1">Valor de Face</label>
                          <input type="number" step="0.01" value={title.value} onChange={e => updateRepurchaseTitle(title.id, 'value', parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-amber-200 rounded-lg text-sm focus:border-amber-500 outline-none" />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1 flex justify-between">
                            <span>Total Recompra</span>
                            {itemData && itemData.daysLate > 0 && <span className="text-rose-500 text-[9px] lowercase flex items-center gap-1"><History size={10} /> {itemData.daysLate}d atraso</span>}
                          </label>
                          <div className="px-3 py-1.5 bg-amber-100/50 text-amber-800 rounded-lg text-sm font-bold border border-amber-200/50 flex justify-between items-center">
                            <span>R$ {itemData?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <Info size={14} className="text-amber-400 cursor-help" title={`Juros (${selectedInstitution?.repurchaseRate}%): R$ ${itemData?.interestFee.toFixed(2)}\nMulta (${selectedInstitution?.repurchasePenalty}%): R$ ${itemData?.penaltyFee.toFixed(2)}\nMora (${selectedInstitution?.repurchaseMora}%): R$ ${itemData?.moraFee.toFixed(2)}`} />
                          </div>
                        </div>
                        <div className="md:col-span-1 flex items-end justify-center">
                          <button onClick={() => setRepurchaseTitles(repurchaseTitles.filter(t => t.id !== title.id))} className="mb-1 p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl sticky top-24 overflow-hidden border border-slate-700">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                <TrendingDown size={20} className="text-blue-400" />
                Resumo do Crédito
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-slate-400 text-sm">
                  <span>Bruto Antecipado</span>
                  <span className="font-semibold text-white">R$ {totals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                
                <div className="flex justify-between items-center text-slate-400 text-sm">
                  <span>Deságio + IOF + AdV</span>
                  <span className="text-rose-400">- R$ {(totals.gross - totals.net).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center text-slate-400 text-sm">
                  <span>TAC + Transf + Boletos</span>
                  <span className="text-rose-400">- R$ {((selectedInstitution?.transferFee || 0) + (selectedInstitution?.tac || 0) + totalTicketFees).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                {repurchaseData.grandTotal > 0 && (
                  <div className="flex justify-between items-center p-3 bg-rose-500/10 rounded-lg border border-rose-500/20 text-sm">
                    <div className="flex flex-col">
                      <span className="text-rose-400 font-bold">Dedução Recompras</span>
                      <span className="text-[9px] text-rose-500/70 uppercase">Juros + Multa + Mora</span>
                    </div>
                    <span className="text-rose-400 font-bold">- R$ {repurchaseData.grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-white/10 mt-6">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-slate-300 font-medium uppercase tracking-widest text-[10px]">Crédito Estimado</span>
                    </div>
                    <p className={`text-2xl font-bold ${finalNet < 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                      R$ {finalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button onClick={handleExportPDF} disabled={isExporting} className="py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 text-sm disabled:opacity-50">
                  {isExporting ? <RefreshCcw className="animate-spin" size={18} /> : <FileText size={18} />} PDF
                </button>
                <button onClick={handleSaveToDB} disabled={savedStatus || finalNet <= 0} className={`py-3 text-sm ${savedStatus ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50`}>
                  {savedStatus ? <><CheckCircle size={18} /> OK!</> : <><Save size={18} /> Salvar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <TableIcon size={20} className="text-blue-600" /> Detalhamento Analítico
          </h3>
          <div className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full uppercase tracking-widest">
            {selectedInstitution?.name}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200">
              <tr className="text-slate-500 font-bold uppercase">
                <th className="px-6 py-4">Pagador</th>
                <th className="px-6 py-4">Nota</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4 text-right">Bruto</th>
                <th className="px-6 py-4 text-center">Dias (R/C)</th>
                <th className="px-6 py-4 text-right">Deságio</th>
                <th className="px-6 py-4 text-right">IOF</th>
                <th className="px-6 py-4 text-right">Ad Val.</th>
                <th className="px-6 py-4 text-right bg-blue-50/50">Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((item) => (
                <tr key={item.titleId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700 uppercase truncate max-w-[150px]">{item.payer || '---'}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{item.invoiceNumber || '---'}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDateDisplay(item.dueDate)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">R$ {item.grossValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-center font-semibold">
                    <span className="flex items-center justify-center gap-1">
                      <span className="text-slate-400">{item.days}</span>
                      <span className="text-slate-200">/</span>
                      <span className={`px-2 py-0.5 rounded ${item.calculationDays > item.days ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {item.calculationDays}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-rose-500">R$ {item.discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-rose-500">R$ {item.iofValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-rose-500">R$ {item.adValoremValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right bg-blue-50/30 font-bold text-blue-700">R$ {item.netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr className="font-bold text-slate-900">
                <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider">Subtotais Antecipação</td>
                <td className="px-6 py-4 text-right">R$ {totals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 text-right text-rose-600">R$ {totals.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-right text-rose-600">R$ {totals.iof.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-right text-rose-600">R$ {totals.advalorem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-right bg-blue-100 text-blue-800 text-sm">R$ {totals.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvanceCalculator;
