"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  coordinator: "Coordenador",
  engineer: "Engenheiro/Arquiteto",
  funcionario: "Funcionário",
};
const ROLE_COLOR: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  coordinator: "bg-purple-100 text-purple-700",
  engineer: "bg-blue-100 text-blue-700",
  funcionario: "bg-teal-100 text-teal-700",
};

type InternalRole = "admin" | "coordinator" | "engineer" | "funcionario";

// ── Modal Criar / Editar ─────────────────────────────────────
function UserModal({
  user,
  onClose,
  onSuccess,
}: {
  user?: { id: string; name: string; email: string; role: string; active: boolean };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: (user?.role ?? "funcionario") as InternalRole,
    password: "",
    active: user?.active ?? true,
  });
  const [erro, setErro] = useState("");

  const criar = trpc.users.createInternal.useMutation({ onSuccess: () => { onSuccess(); onClose(); }, onError: e => setErro(e.message) });
  const editar = trpc.users.updateInternal.useMutation({ onSuccess: () => { onSuccess(); onClose(); }, onError: e => setErro(e.message) });
  const excluir = trpc.users.deleteInternal.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const isPending = criar.isPending || editar.isPending || excluir.isPending;
  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]";

  const handleSave = () => {
    if (!form.name || !form.email) { setErro("Nome e e-mail são obrigatórios."); return; }
    if (!isEdit && !form.password) { setErro("Senha obrigatória para novo usuário."); return; }
    if (isEdit && user) {
      editar.mutate({
        id: user.id,
        name: form.name,
        role: form.role,
        active: form.active,
        ...(form.password ? { newPassword: form.password } : {}),
      });
    } else {
      criar.mutate({ name: form.name, email: form.email, role: form.role, password: form.password });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4">{isEdit ? "Editar Usuário" : "Novo Usuário"}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome *</label>
            <input value={form.name} onChange={e => { setForm(f => ({...f, name: e.target.value})); setErro(""); }} className={inputCls} placeholder="Nome completo" />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">E-mail *</label>
              <input type="email" value={form.email} onChange={e => { setForm(f => ({...f, email: e.target.value})); setErro(""); }} className={inputCls} placeholder="email@exemplo.com" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Perfil *</label>
            <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value as InternalRole}))} className={inputCls}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {isEdit ? "Nova Senha (deixe em branco para manter)" : "Senha *"}
            </label>
            <input type="password" value={form.password} onChange={e => { setForm(f => ({...f, password: e.target.value})); setErro(""); }} className={inputCls} placeholder={isEdit ? "Somente para alterar" : "Mínimo 6 caracteres"} />
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({...f, active: e.target.checked}))} className="w-4 h-4 accent-[#1A1A1A]" />
              <label htmlFor="active" className="text-sm text-gray-600 font-medium">Acesso ativo</label>
            </div>
          )}
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erro}</div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          {isEdit && user && (
            <button
              onClick={() => { if (confirm(`Remover ${user.name}? Esta ação não pode ser desfeita.`)) excluir.mutate({ id: user.id }); }}
              disabled={isPending}
              className="py-2.5 px-3 border border-red-200 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-60"
              title="Excluir"
            >🗑</button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={isPending} className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-60">
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ─────────────────────────────────────────
export default function EquipePage() {
  const [modal, setModal] = useState<{
    user?: { id: string; name: string; email: string; role: string; active: boolean };
  } | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");

  const { data: users, refetch } = trpc.users.listInternal.useQuery();

  const filtered = (users ?? []).filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const counts = (users ?? []).reduce((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 uppercase tracking-wide">Equipe</h1>
          <p className="text-gray-400 text-sm mt-0.5">Usuários internos do sistema</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F5A623] text-white text-sm font-semibold rounded-lg hover:bg-[#F7BB52] transition whitespace-nowrap"
        >
          + Novo Usuário
        </button>
      </div>

      {/* KPI cards por role */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {Object.entries(ROLE_LABEL).map(([role, label]) => (
          <div key={role} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-extrabold text-[#1A1A1A]">{counts[role] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap sm:flex-nowrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
        >
          <option value="">Todos os perfis</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            {users?.length === 0 ? "Nenhum usuário cadastrado ainda." : "Nenhum resultado para os filtros aplicados."}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#1A1A1A] text-white">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">E-mail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Perfil</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Criado em</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3 font-semibold text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${ROLE_COLOR[u.role] ?? "bg-gray-100 text-gray-500"}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModal({ user: u })}
                      className="text-gray-300 hover:text-[#1A1A1A] transition text-xs"
                      title="Editar"
                    >✏</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <UserModal
          user={modal.user}
          onClose={() => setModal(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
