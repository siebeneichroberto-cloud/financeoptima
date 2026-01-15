
import React, { useState, useEffect } from 'react';
import { FinancialInstitution } from '../../types';
import { db } from '../../db';
import { Building2, Edit2, Trash2, Info, Percent, Wallet, RefreshCw } from 'lucide-react';

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
    minDays: 0
  });

  useEffect(() => {
    db.saveInstitutions(institutions);
  }, [institutions]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      setInstitutions(prev => prev.map(i => i.id === formData.id ? formData : i));
    } else {
      setInstitutions(prev => [...prev, { ...formData, id: Date.now().toString() }]);
    }
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
      minDays: 0 
    });
  };

  const handleEdit = (inst: FinancialInstitution) => {
    setFormData({
      ...inst,
      repurchasePenalty: inst.repurchasePenalty || 0,
      repurchaseMora: inst.repurchaseMora || 0
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
                onClick={() => setFormData({ id: '', name: '', monthlyRate: 0, adValorem: 0, tac: 0, iofDaily: 0.0041, iofFixed: 0.38, repurchaseRate: 0, repurchasePenalty: 0, repurchaseMora: 0, ticketFee: 0, transferFee: 0, minDays: 0 })} 
                className="text-[10px] text-slate-400 hover:text-blue-600 font-bold uppercase tracking-widest"
              >
                Cancelar
              </button>
            )}
          </div>
          
          <form onSubmit={handleSave} className="p-6 space-y-8">
            {/* INFORMAÇÕES GERAIS */}
            <section className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Identificação do Banco / Fundo</label>
                <input required type="text" placeholder="Ex: Safra, XP, FIDC..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
              </div>
            </section>

            {/* SEÇÃO ANTECIPAÇÃO */}
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
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">IOF Fixo (%)</label>
                  <input type="number" step="0.0001" value={formData.iofFixed} onChange={e => setFormData({...formData, iofFixed: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">IOF Diário (%)</label>
                  <input type="number" step="0.0001" value={formData.iofDaily} onChange={e => setFormData({...formData, iofDaily: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TAC (R$)</label>
                  <input type="number" step="0.01" value={formData.tac} onChange={e => setFormData({...formData, tac: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Transf. (R$)</label>
                  <input type="number" step="0.01" value={formData.transferFee} onChange={e => setFormData({...formData, transferFee: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Boleto (R$)</label>
                  <input type="number" step="0.01" value={formData.ticketFee} onChange={e => setFormData({...formData, ticketFee: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  Prazo Mínimo (Dias)
                  <Info size={12} className="text-slate-300" />
                </label>
                <input type="number" value={formData.minDays} onChange={e => setFormData({...formData, minDays: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none" />
              </div>
            </section>

            {/* SEÇÃO RECOMPRA */}
            <section className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <RefreshCw size={16} className="text-amber-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase">Custos de Recompra</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Juros Recompra (% a.m.)</label>
                  <div className="relative">
                    <input type="number" step="0.01" value={formData.repurchaseRate} onChange={e => setFormData({...formData, repurchaseRate: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-amber-50/30 border border-amber-100 rounded-lg text-sm focus:bg-white outline-none" />
                    <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Multa (%)</label>
                  <input type="number" step="0.01" value={formData.repurchasePenalty} onChange={e => setFormData({...formData, repurchasePenalty: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-amber-50/30 border border-amber-100 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mora (% a.m.)</label>
                  <input type="number" step="0.01" value={formData.repurchaseMora} onChange={e => setFormData({...formData, repurchaseMora: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-amber-50/30 border border-amber-100 rounded-lg text-sm focus:bg-white outline-none" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Multa sobre o valor de face. Juros e Mora calculados pro-rata die com base nos dias de atraso.</p>
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
                <div key={inst.id} className="p-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl border border-blue-100">
                      {inst.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{inst.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Antecipação: <span className="text-slate-900">{inst.monthlyRate}% a.m.</span></p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Recompra: <span className="text-amber-600">{inst.repurchaseRate}% a.m.</span></p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Multa/Mora: <span className="text-amber-600">{inst.repurchasePenalty}% / {inst.repurchaseMora}%</span></p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Mínimo: <span className="text-slate-900">{inst.minDays}d</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
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
