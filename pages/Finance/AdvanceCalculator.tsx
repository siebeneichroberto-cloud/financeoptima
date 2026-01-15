
import React, { useState, useMemo } from 'react';
import { Title, FinancialInstitution, Operation, CalculationResult } from '../../types';
import { db } from '../../db';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Calendar as CalendarIcon, 
  CreditCard,
  Save, 
  CheckCircle, 
  TrendingDown, 
  Table as TableIcon, 
  Info, 
  RefreshCcw, 
  History, 
  FileText,
  Wallet,
  Search,
  PenTool,
  Hash,
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const AdvanceCalculator: React.FC = () => {
  const institutions = db.getInstitutions();
  const [operationDate, setOperationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedInstId, setSelectedInstId] = useState<string>(institutions[0]?.id || '');
  
  const [titles, setTitles] = useState<Title[]>([
    { id: '1', payer: 'CLIENTE EXEMPLO LTDA', invoiceNumber: '1024/A', value: 5000, dueDate: '' }
  ]);

  const [repurchaseTitles, setRepurchaseTitles] = useState<Title[]>([]);
  const [savedStatus, setSavedStatus] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectedInstitution = useMemo(() => 
    institutions.find(i => i.id === selectedInstId) || institutions[0]
  , [selectedInstId, institutions]);

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
      const diffInMs = dueDate.getTime() - opDate.getTime();
      const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
      const actualDays = diffInDays >= 0 ? diffInDays : 0;
      const calculationDays = Math.max(actualDays, inst.minDays || 0);
      const dailyRate = (inst.monthlyRate / 100) / 30;
      const discountValue = title.value * (1 - (1 / Math.pow(1 + dailyRate, calculationDays)));
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
  }, [titles, operationDate, selectedInstitution]);

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

  const fixedFees = (selectedInstitution?.tac || 0) + (selectedInstitution?.transferFee || 0);
  const finalNet = totals.net - fixedFees - repurchaseData.grandTotal;

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
      details: { results, repurchaseItems: repurchaseData.items, repurchaseTotal: repurchaseData.grandTotal, fixedFees, totals }
    };
    db.saveOperation(newOp);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const generateProfessionalPDF = (opData: any, inst: FinancialInstitution) => {
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
    doc.text('RELATÓRIO DE ANTECIPAÇÃO DE TÍTULOS', 15, 32);
    doc.text(`GERADO EM: ${new Date().toLocaleString('pt-BR')}`, 282, 15, { align: 'right' });
    doc.text(`ID OPERAÇÃO: ${opData.id || 'SIMULAÇÃO'}`, 282, 22, { align: 'right' });

    // INFO SECTION
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMAÇÕES GERAIS', 15, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`Instituição Financeira: ${inst.name}`, 15, 58);
    doc.text(`Data de Referência: ${formatDateDisplay(opData.referenceDate || operationDate)}`, 15, 63);

    // SUMMARY BOXES (Custom design using autoTable with manual rendering)
    (doc as any).autoTable({
      startY: 70,
      head: [['VOLUME BRUTO', 'DEDUÇÕES TOTAIS', 'RECOMPRAS', 'CRÉDITO LÍQUIDO']],
      body: [[
        formatCurrency(opData.totals?.gross || totals.gross),
        formatCurrency((opData.totals?.gross || totals.gross) - (opData.netTotal || finalNet) - (opData.repurchaseTotal || repurchaseData.grandTotal)),
        formatCurrency(opData.repurchaseTotal || repurchaseData.grandTotal),
        formatCurrency(opData.netTotal || finalNet)
      ]],
      theme: 'grid',
      headStyles: { fillColor: blue, textColor: 255, fontSize: 10, halign: 'center', fontStyle: 'bold' },
      bodyStyles: { fontSize: 14, halign: 'center', fontStyle: 'bold', textColor: blue },
      margin: { left: 15, right: 15 }
    });

    // ANALYTICAL TABLE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DETALHAMENTO ANALÍTICO DE TÍTULOS', 15, (doc as any).lastAutoTable.finalY + 15);

    const tableData = (opData.details?.results || results).map((item: any) => [
      item.payer?.toUpperCase() || '---',
      item.invoiceNumber || '---',
      formatDateDisplay(item.dueDate),
      formatCurrency(item.grossValue),
      `${item.days}/${item.calculationDays}d`,
      formatCurrency(item.discountValue + item.iofValue + item.adValoremValue),
      formatCurrency(item.ticketFeeValue + item.serasaFeeValue + item.signatureFeeValue),
      formatCurrency(item.netValue)
    ]);

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Pagador', 'Nota', 'Venc.', 'Bruto', 'Prazo', 'Deságio/IOF', 'Taxas Tít.', 'Líquido']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' },
        5: { halign: 'right', textColor: [220, 38, 38] },
        6: { halign: 'right', textColor: [5, 150, 105] },
        7: { halign: 'right', fontStyle: 'bold', fillColor: [240, 249, 255] }
      },
      foot: [['TOTAL ANTECIPAÇÃO', '', '', formatCurrency(opData.totals?.gross || totals.gross), '', '', '', formatCurrency(opData.totals?.net || totals.net)]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold' }
    });

    // REPURCHASE SECTION IF EXISTS
    const repItems = opData.details?.repurchaseItems || repurchaseData.items;
    if (repItems.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('RECOMPRAS DE TÍTULOS VENCIDOS', 15, (doc as any).lastAutoTable.finalY + 15);
      
      const repTableData = repItems.map((rep: any) => [
        rep.payer?.toUpperCase(),
        formatDateDisplay(rep.dueDate),
        `${rep.daysLate}d`,
        formatCurrency(rep.value),
        formatCurrency(rep.totalFeesPerItem),
        formatCurrency(rep.total)
      ]);

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Pagador', 'Venc. Original', 'Atraso', 'Valor Nominal', 'Encargos', 'Total Recompra']],
        body: repTableData,
        theme: 'plain',
        headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7 },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
      });
    }

    // FOOTER SIGNATURES
    const finalY = (doc as any).lastAutoTable.finalY + 25;
    if (finalY < 180) {
      doc.setDrawColor(200);
      doc.line(30, finalY + 15, 120, finalY + 15);
      doc.line(177, finalY + 15, 267, finalY + 15);
      doc.setFontSize(8);
      doc.text('ASSINATURA DO CEDENTE', 75, finalY + 20, { align: 'center' });
      doc.text('ASSINATURA DO CESSIONÁRIO', 222, finalY + 20, { align: 'center' });
    }

    doc.save(`Relatorio_Optima_${inst.name.replace(/\s/g, '_')}_${formatDateDisplay(operationDate).replace(/\//g, '-')}.pdf`);
  };

  const handleExportPDF = () => {
    if (!selectedInstitution) return;
    setIsExporting(true);
    setTimeout(() => {
      generateProfessionalPDF({}, selectedInstitution);
      setIsExporting(false);
    }, 500);
  };

  const updateTitle = (id: string, field: keyof Title, value: any) => {
    setTitles(titles.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const updateRepurchaseTitle = (id: string, field: keyof Title, value: any) => {
    setRepurchaseTitles(repurchaseTitles.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Wallet size={18} className="text-blue-600" />
                  Antecipação de Títulos
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px]">{titles.length}</span>
                </h4>
                <button onClick={() => setTitles([...titles, { id: Date.now().toString(), payer: '', invoiceNumber: '', value: 0, dueDate: '' }])} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"><Plus size={16} /> Adicionar Título</button>
              </div>
              <div className="space-y-4">
                {titles.map((title) => (
                  <div key={title.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200 group hover:border-blue-200">
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pagador</label>
                      <input type="text" placeholder="Nome" value={title.payer} onChange={e => updateTitle(title.id, 'payer', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none uppercase" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nota</label>
                      <input type="text" placeholder="NF-e" value={title.invoiceNumber} onChange={e => updateTitle(title.id, 'invoiceNumber', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor</label>
                      <input type="number" step="0.01" value={title.value} onChange={e => updateTitle(title.id, 'value', parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vencimento</label>
                      <input type="date" value={title.dueDate} onChange={e => updateTitle(title.id, 'dueDate', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-center">
                      <button onClick={() => titles.length > 1 && setTitles(titles.filter(t => t.id !== title.id))} className="mb-1 p-2 text-slate-300 hover:text-rose-600 rounded-lg"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <RefreshCcw size={18} className="text-amber-600" />
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Títulos para Recompra (Vencidos)</h4>
                  <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[10px]">{repurchaseTitles.length}</span>
                </div>
                <button onClick={() => setRepurchaseTitles([...repurchaseTitles, { id: Date.now().toString(), payer: '', invoiceNumber: '', value: 0, dueDate: '' }])} className="text-amber-600 text-sm font-bold flex items-center gap-1 hover:underline"><Plus size={16} /> Adicionar Recompra</button>
              </div>
              <div className="space-y-4">
                {repurchaseTitles.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-xl text-center text-slate-400 text-xs italic">Nenhum título para recompra.</div>
                ) : (
                  repurchaseTitles.map((title) => {
                    const itemData = repurchaseData.items.find(i => i.id === title.id);
                    return (
                      <div key={title.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-amber-50/30 rounded-xl border border-amber-100 group">
                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-bold text-amber-500 uppercase mb-1">Pagador</label>
                          <input type="text" placeholder="Nome" value={title.payer} onChange={e => updateRepurchaseTitle(title.id, 'payer', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-amber-200 rounded-lg text-sm focus:border-amber-500 outline-none uppercase" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-amber-500 uppercase mb-1">Vencimento Original</label>
                          <input type="date" value={title.dueDate} onChange={e => updateRepurchaseTitle(title.id, 'dueDate', e.target.value)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-amber-200 rounded-lg text-sm focus:border-amber-500 outline-none" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-amber-500 uppercase mb-1">Valor Original</label>
                          <input type="number" step="0.01" value={title.value} onChange={e => updateRepurchaseTitle(title.id, 'value', parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-white text-slate-900 border border-amber-200 rounded-lg text-sm focus:border-amber-500 outline-none" />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">Total com Encargos</label>
                          <div className="px-3 py-1.5 bg-amber-100/50 text-amber-800 rounded-lg text-sm font-bold border border-amber-200/50 flex justify-between items-center h-[30px]">
                            <span>R$ {itemData?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            {itemData && itemData.daysLate > 0 && <span className="text-[9px] text-rose-500 font-bold">{itemData.daysLate}d atraso</span>}
                          </div>
                        </div>
                        <div className="md:col-span-1 flex items-end justify-center">
                          <button onClick={() => setRepurchaseTitles(repurchaseTitles.filter(t => t.id !== title.id))} className="mb-1 p-2 text-slate-300 hover:text-rose-600 rounded-lg"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl sticky top-24 border border-slate-700 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-blue-400">
              <TrendingDown size={20} /> Resumo do Crédito
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-400 text-sm">
                <span>Total Bruto</span>
                <span className="font-semibold text-white">R$ {totals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-sm">
                <span>Dedução Financeira (Des/IOF)</span>
                <span className="text-rose-400">- R$ {(totals.discount + totals.iof + totals.advalorem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Taxas por Título ({titles.length})</span>
                <div className="flex justify-between items-center text-slate-400 text-xs pl-2 border-l border-slate-800">
                  <span>Boletos / Serasa / Assin.</span>
                  <span>- R$ {(totals.ticket + totals.serasa + totals.signature).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-sm border-t border-slate-800 pt-3">
                <span>Custos Fixos (TAC/Transf)</span>
                <span className="text-rose-400">- R$ {fixedFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {repurchaseData.grandTotal > 0 && (
                <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20 flex justify-between items-center">
                  <span className="text-rose-400 font-bold text-xs uppercase">Dedução Recompras</span>
                  <span className="text-rose-400 font-bold">R$ {repurchaseData.grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-slate-300 font-medium uppercase text-[10px] tracking-widest">Crédito Final</span>
                    <p className="text-[9px] text-slate-500 italic">Disponível para saque</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    R$ {finalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button 
                onClick={handleExportPDF} 
                disabled={isExporting}
                className="py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs border border-white/5 transition-all disabled:opacity-50"
              >
                {isExporting ? <RefreshCcw size={16} className="animate-spin" /> : <FileText size={16} />}
                Relatório
              </button>
              <button onClick={handleSaveToDB} disabled={savedStatus || finalNet <= 0} className={`py-3 text-xs ${savedStatus ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold rounded-xl transition-all shadow-lg`}>
                {savedStatus ? 'Concluído!' : 'Salvar Cálculo'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <TableIcon size={20} className="text-blue-600" /> Detalhamento Analítico
          </h3>
          <div className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full uppercase">
            {selectedInstitution?.name}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr className="text-slate-500 font-bold uppercase whitespace-nowrap">
                <th className="px-4 py-4">Pagador</th>
                <th className="px-4 py-4">Nota</th>
                <th className="px-4 py-4">Venc.</th>
                <th className="px-4 py-4 text-right">Bruto</th>
                <th className="px-4 py-4 text-center">Dias</th>
                <th className="px-4 py-4 text-right text-rose-500">Deságio</th>
                <th className="px-4 py-4 text-right text-rose-500">IOF</th>
                <th className="px-4 py-4 text-right text-rose-500">AdV.</th>
                <th className="px-4 py-4 text-right text-emerald-600">Bol.</th>
                <th className="px-4 py-4 text-right text-emerald-600">Ser.</th>
                <th className="px-4 py-4 text-right text-emerald-600">Assin.</th>
                <th className="px-4 py-4 text-right bg-blue-50/50 border-l border-slate-200">Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((item) => (
                <tr key={item.titleId} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                  <td className="px-4 py-3 font-bold text-slate-700 uppercase truncate max-w-[120px]">{item.payer || '---'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.invoiceNumber || '---'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateDisplay(item.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">R$ {item.grossValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-slate-400">{item.days}</span>/<span className="text-blue-600 font-bold">{item.calculationDays}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-rose-500/80">R$ {item.discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right text-rose-500/80">R$ {item.iofValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right text-rose-500/80">R$ {item.adValoremValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">R$ {item.ticketFeeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">R$ {item.serasaFeeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">R$ {item.signatureFeeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right bg-blue-50/30 font-bold text-blue-700 border-l border-slate-100">R$ {item.netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr className="font-bold text-slate-900 whitespace-nowrap">
                <td colSpan={3} className="px-4 py-4 text-right uppercase text-[10px]">Totais Antecipação</td>
                <td className="px-4 py-4 text-right font-bold">R$ {totals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td></td>
                <td className="px-4 py-4 text-right text-rose-600">R$ {totals.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-4 text-right text-rose-600">R$ {totals.iof.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-4 text-right text-rose-600">R$ {totals.advalorem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-4 text-right text-emerald-800">R$ {totals.ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-4 text-right text-emerald-800">R$ {totals.serasa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-4 text-right text-emerald-800">R$ {totals.signature.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-4 text-right bg-blue-100 text-blue-800 border-l border-slate-200 font-bold">R$ {totals.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvanceCalculator;
