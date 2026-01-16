
import React, { useState, useEffect } from 'react';
import { FinancialInstitution } from '../../types';
import { db } from '../../db';
import { Building2, Edit2, Trash2, Info, Percent, Wallet, RefreshCw, FileText, Search, Clock, ShieldAlert } from 'lucide-react';

const InstitutionRegistry: React.FC = () => {
  const [institutions, setInstitutions] = useState<FinancialInstitution[]>(db.getInstitutions());
  const [formData, setFormData] = useState<FinancialInstitution>({ 
    id: '', 
    name: '', 
    monthlyRate: 0, 
    adValorem: 0, 
    tac: 0, 
    iofDaily: 0.0041, 
    iofFixed: 0.38, 
    repurchaseRate: 0,
    repurchasePenalty: 0,
    repurchaseMora: 0,
    ticketFee: 0, 
    transferFee: 0,
    serasaFee: 0,
    signatureFee: 0,
    minDays: 0,
    workingDaysFloat: 0,
    observations: ''
  });

  useEffect(() => {
    db.saveInstitutions(institutions);
  }, [institutions]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      setInstitutions(prev => prev.map(i => i.id === formData.id ? formData : i));
    } else {
      setInstitutions(prev => [...prev, { ...formData, id: Date.now().toString() }]);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      id: '', 
      name: '', 
      monthlyRate: 0, 
      adValorem: 0, 
      tac: 0, 
      iofDaily: 0.0041, 
      iofFixed: 0.38, 
      repurchaseRate: 0,
      repurchasePenalty: 0,
      repurchaseMora: 0,
      ticketFee: 0, 
      transferFee: 0, 
      serasaFee: 0,
      signatureFee: 0,
      minDays: 0,
      workingDaysFloat: 0,
      observations: ''
    });
  };

  const handleEdit = (inst: FinancialInstitution) => {
    setFormData({
      ...inst,
      repurchaseRate: inst.repurchaseRate || 0,
      repurchasePenalty: inst.repurchasePenalty || 0,
      repurchaseMora: inst.repurchaseMora || 0,
      serasaFee: inst.serasaFee || 0,
      signatureFee: inst.signatureFee || 0,
      minDays: inst.minDays || 0,
      workingDaysFloat: inst.workingDaysFloat || 0,
      observations: inst.observations || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="xl:col-span-1">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm sticky top-24 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="text-blue-600" size={20} /> 
              {formData.id ? 'Editar Banco' : 'Novo Banco'}
            </h3>
            {formData.id && (
              <button 
                onClick={resetForm} 
                className="text-[10px] text-slate-400 hover:text-blue-600 font-bold uppercase tracking-widest"
              >
                Cancelar
              </button>
            )}
          </div>
          
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <section className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Identificação do Banco / Fundo</label>
                <input required type="text" placeholder="Ex: Safra, XP, FIDC..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Wallet size={16} className="text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase">Custos de Antecipação</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Taxa (% a.m.)</label>
                  <input type="number" step="0.01" value={formData.monthlyRate} onChange={e => setFormData({...formData, monthlyRate: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ad Valorem (%)</label>
                  <input type="number" step="0.01" value={formData.adValorem} onChange={e => setFormData({...formData, adValorem: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TAC (R$)</label>
                  <input type="number" step="0.01" value={formData.tac} onChange={e => setFormData({...formData, tac: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Transf. (R$)</label>
                  <input type="number" step="0.01" value={formData.transferFee} onChange={e => setFormData({...formData, transferFee: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <Clock size={10} /> Prazo Mín. (Dias)
                  </label>
                  <input type="number" value={formData.minDays} onChange={e => setFormData({...formData, minDays: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <RefreshCw size={10} /> Float de Dias
                  </label>
                  <input type="number" value={formData.workingDaysFloat} onChange={e => setFormData({...formData, workingDaysFloat: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldAlert size={16} className="text-rose-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase">Configuração IOF</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">IOF Diário (%)</label>
                  <input type="number" step="0.0001" value={formData.iofDaily} onChange={e => setFormData({...formData, iofDaily: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">IOF Fixo (%)</label>
                  <input type="number" step="0.01" value={formData.iofFixed} onChange={e => setFormData({...formData, iofFixed: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Search size={16} className="text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase">Custos por Título</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Boleto (R$)</label>
                  <input type="number" step="0.01" value={formData.ticketFee} onChange={e => setFormData({...formData, ticketFee: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Serasa (R$)</label>
                  <input type="number" step="0.01" value={formData.serasaFee} onChange={e => setFormData({...formData, serasaFee: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assinatura Eletrônica (R$)</label>
                  <input type="number" step="0.01" value={formData.signatureFee} onChange={e => setFormData({...formData, signatureFee: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText size={16} className="text-slate-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase">Observações</h4>
              </div>
              <textarea 
                rows={3} 
                placeholder="Observações..." 
                value={formData.observations} 
                onChange={e => setFormData({...formData, observations: e.target.value})} 
                className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm resize-none outline-none"
              />
            </section>

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
              {formData.id ? 'Atualizar Instituição' : 'Cadastrar Instituição'}
            </button>
          </form>
        </div>
      </div>

      <div className="xl:col-span-2">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Instituições Cadastradas</h3>
            <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{institutions.length} registros</span>
          </div>
          <div className="divide-y divide-slate-100">
            {institutions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-400 text-sm italic">Nenhuma instituição cadastrada.</p>
              </div>
            ) : (
              institutions.map(inst => (
                <div key={inst.id} className="p-6 flex items-start justify-between hover:bg-slate-50/80 transition-colors group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl border border-blue-100 shrink-0">
                      {inst.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{inst.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Taxa: <span className="text-slate-900">{inst.monthlyRate}% a.m.</span></p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Mínimo: <span className="text-slate-900">{inst.minDays}d</span></p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Float: <span className="text-slate-900">{inst.workingDaysFloat}u</span></p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Serasa: <span className="text-slate-900">R$ {formatBRL(inst.serasaFee || 0)}</span></p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Assinatura: <span className="text-slate-900">R$ {formatBRL(inst.signatureFee || 0)}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleEdit(inst)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar"><Edit2 size={18} /></button>
                    <button onClick={() => setInstitutions(institutions.filter(i => i.id !== inst.id))} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Excluir"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionRegistry;
