
import React, { useState, useEffect } from 'react';
import { User, UserRole, Module } from '../types';
import { db } from '../db';
import { Plus, Search, MoreVertical, Shield, Trash2, X, Lock } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ 
    name: '', 
    email: '', 
    password: '',
    role: UserRole.USER, 
    permissions: [Module.FINANCE] 
  });

  useEffect(() => {
    db.saveUsers(users);
  }, [users]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.password) {
      alert('A senha é obrigatória para o primeiro acesso.');
      return;
    }
    const user = { ...newUser, id: Math.random().toString(36).substr(2, 9) } as User;
    setUsers([...users, user]);
    setShowModal(false);
    setNewUser({ name: '', email: '', password: '', role: UserRole.USER, permissions: [Module.FINANCE] });
  };

  const deleteUser = (id: string) => {
    if (id === '1') return alert('O Master não pode ser removido.');
    if (window.confirm('Excluir este usuário permanentemente?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Usuários</h1>
          <p className="text-slate-500">Controle de acesso e senhas do sistema.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"><Plus size={20} /> Novo Usuário</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-100"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar usuário por nome ou e-mail..." className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm" /></div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100"><th className="px-6 py-4">Usuário</th><th className="px-6 py-4">Perfil</th><th className="px-6 py-4">Módulos</th><th className="px-6 py-4 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm">{user.name.charAt(0)}</div><div><p className="text-sm font-semibold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div></div></td>
                  <td className="px-6 py-4"><span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${user.role === UserRole.MASTER ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td>
                  <td className="px-6 py-4"><div className="flex flex-wrap gap-1">{user.permissions.map(p => <span key={p} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded border border-slate-200 font-medium">{p}</span>)}</div></td>
                  <td className="px-6 py-4 text-right"><button onClick={() => deleteUser(user.id)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="text-lg font-bold text-slate-900">Novo Usuário</h3><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label><input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label><input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha Inicial</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Defina a senha do usuário" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-all">Criar Usuário</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
