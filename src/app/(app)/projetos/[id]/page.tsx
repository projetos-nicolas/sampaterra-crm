"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UploadMultiplo } from "@/components/docs/UploadMultiplo";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  aguardando_inicio: { label: "Aguardando Início", color: "bg-gray-100 text-gray-600", next: "em_andamento" },
  em_andamento:      { label: "Em Andamento",      color: "bg-blue-50 text-blue-700",  next: "concluido" },
  pausado:           { label: "Pausado",            color: "bg-yellow-50 text-yellow-700", next: "em_andamento" },
  concluido:         { label: "Concluído",          color: "bg-green-50 text-green-700",   next: null },
  cancelado:         { label: "Cancelado",          color: "bg-red-50 text-red-600",        next: null },
} as const;

type ProjectStatus = keyof typeof STATUS_CONFIG;

const WEATHER_OPTIONS = [
  { value: "sol", label: "☀️ Sol" },
  { value: "nublado", label: "⛅ Nublado" },
  { value: "chuva", label: "🌧️ Chuva" },
  { value: "chuva_forte", label: "⛈️ Chuva Forte" },
  { value: "frio", label: "🌬️ Frio" },
];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

// ─── Aba: Visão Geral ─────────────────────────────────────────────────────────

function AbaVisaoGeral({ project, refetch }: { project: any; refetch: () => void }) {
  const updateStatus = trpc.projects.updateStatus.useMutation({ onSuccess: refetch });
  const [editando, setEditando] = useState(false);
  const update = trpc.projects.update.useMutation({ onSuccess: () => { setEditando(false); refetch(); } });
  const { data: propostas } = trpc.projects.getProposalsForSelect.useQuery();

  const [form, setForm] = useState({
    name: project.name,
    serviceType: project.serviceType ?? "",
    startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
    expectedEndDate: project.expectedEndDate ? new Date(project.expectedEndDate).toISOString().split("T")[0] : "",
    address: project.address ?? "",
    city: project.city ?? "",
    state: project.state ?? "",
    notes: project.notes ?? "",
    proposalId: project.proposalId ?? "",
  });

  const STATUS_ORDER: ProjectStatus[] = ["aguardando_inicio", "em_andamento", "pausado", "concluido", "cancelado"];
  const pago = project.paymentSchedule?.reduce((s: number, p: any) => s + Number(p.receivedValue), 0) ?? 0;
  const total = Number(project.contractValue);
  const percPago = total > 0 ? Math.round((pago / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Status do Projeto</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const ativo = project.status === s;
            return (
              <button key={s} onClick={() => !ativo && updateStatus.mutate({ id: project.id, status: s })}
                disabled={ativo || updateStatus.isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${ativo ? `${cfg.color} border-transparent` : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Financeiro */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Financeiro</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Contrato</p>
            <p className="font-bold text-gray-900">{fmt(total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Recebido</p>
            <p className="font-bold text-green-600">{fmt(pago)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">A receber</p>
            <p className="font-bold text-orange-500">{fmt(total - pago)}</p>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${percPago}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{percPago}% recebido</p>
      </div>

      {/* Informações */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Informações</h3>
          <button onClick={() => setEditando(!editando)}
            className="text-xs text-[#1A1A1A] font-semibold hover:underline">
            {editando ? "Cancelar" : "Editar"}
          </button>
        </div>

        {editando ? (
          <form onSubmit={(e) => { e.preventDefault(); update.mutate({ id: project.id, ...form, serviceType: form.serviceType || null, startDate: form.startDate || null, expectedEndDate: form.expectedEndDate || null, address: form.address || null, city: form.city || null, state: form.state || null, notes: form.notes || null, proposalId: form.proposalId || null }); }}
            className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nome</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Proposta Vinculada</label>
              <select value={form.proposalId} onChange={(e) => setForm((f) => ({ ...f, proposalId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30">
                <option value="">Nenhuma</option>
                {propostas?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.title} ({p.client?.company || p.client?.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Início</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Entrega</label>
                <input type="date" value={form.expectedEndDate} onChange={(e) => setForm((f) => ({ ...f, expectedEndDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Cidade</label>
                <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">UF</label>
                <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} maxLength={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Observações</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 resize-none" />
            </div>
            <button type="submit" disabled={update.isPending}
              className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] transition disabled:opacity-50">
              {update.isPending ? "Salvando..." : "Salvar"}
            </button>
          </form>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-xs text-gray-400">Cliente</dt><dd className="font-medium text-gray-900">{project.client?.company || project.client?.name}</dd></div>
            <div><dt className="text-xs text-gray-400">Proposta</dt><dd className="font-medium text-gray-900">{project.proposal?.code ?? "—"}</dd></div>
            <div><dt className="text-xs text-gray-400">Início</dt><dd className="font-medium text-gray-900">{fmtDate(project.startDate)}</dd></div>
            <div><dt className="text-xs text-gray-400">Entrega Prevista</dt><dd className="font-medium text-gray-900">{fmtDate(project.expectedEndDate)}</dd></div>
            <div><dt className="text-xs text-gray-400">Localização</dt><dd className="font-medium text-gray-900">{project.city && project.state ? `${project.city}/${project.state}` : project.city || "—"}</dd></div>
            <div><dt className="text-xs text-gray-400">Criado em</dt><dd className="font-medium text-gray-900">{fmtDate(project.createdAt)}</dd></div>
            {project.notes && <div className="col-span-2"><dt className="text-xs text-gray-400">Observações</dt><dd className="font-medium text-gray-900 whitespace-pre-line">{project.notes}</dd></div>}
          </dl>
        )}
      </div>
    </div>
  );
}

// ─── Aba: Marcos ─────────────────────────────────────────────────────────────

function AbaMarcos({ project, refetch }: { project: any; refetch: () => void }) {
  const toggleMut = trpc.projects.toggleMilestone.useMutation({ onSuccess: refetch });
  const deleteMut = trpc.projects.deleteMilestone.useMutation({ onSuccess: refetch });
  const createMut = trpc.projects.createMilestone.useMutation({ onSuccess: () => { setNovoForm({ name: "", description: "", dueDate: "" }); setAdding(false); refetch(); } });

  const [adding, setAdding] = useState(false);
  const [novoForm, setNovoForm] = useState({ name: "", description: "", dueDate: "" });

  const milestones = project.milestones ?? [];
  const concluidos = milestones.filter((m: any) => m.completedAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{concluidos}/{milestones.length} concluídos</p>
        <button onClick={() => setAdding(true)}
          className="px-3 py-1.5 bg-[#F5A623] text-white text-xs font-semibold rounded-lg hover:bg-[#F7BB52] transition">
          + Novo Marco
        </button>
      </div>

      {adding && (
        <div className="bg-white border border-[#1A1A1A]/30 rounded-xl p-4 space-y-3">
          <input value={novoForm.name} onChange={(e) => setNovoForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome do marco *" autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={novoForm.description} onChange={(e) => setNovoForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descrição (opcional)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            <input type="date" value={novoForm.dueDate} onChange={(e) => setNovoForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => { if (!novoForm.name) return; createMut.mutate({ projectId: project.id, name: novoForm.name, description: novoForm.description || undefined, dueDate: novoForm.dueDate || undefined, sortOrder: milestones.length }); }}
              disabled={createMut.isPending}
              className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-50">
              Salvar
            </button>
          </div>
        </div>
      )}

      {milestones.length === 0 && !adding && (
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">
          <p className="font-medium">Nenhum marco cadastrado.</p>
        </div>
      )}

      <div className="space-y-2">
        {milestones.map((m: any) => {
          const concluido = !!m.completedAt;
          const atrasado = m.dueDate && !concluido && new Date(m.dueDate) < new Date();
          return (
            <div key={m.id} className={`bg-white border rounded-xl p-4 flex items-start gap-3 transition ${concluido ? "border-green-200 opacity-80" : atrasado ? "border-red-200" : "border-gray-200"}`}>
              <button onClick={() => toggleMut.mutate({ id: m.id, completed: !concluido })}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${concluido ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-[#1A1A1A]"}`}>
                {concluido && <svg viewBox="0 0 12 12" className="w-3 h-3 fill-white"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${concluido ? "line-through text-gray-400" : "text-gray-900"}`}>{m.name}</p>
                {m.description && <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>}
                {m.dueDate && (
                  <p className={`text-xs mt-1 font-medium ${atrasado ? "text-red-500" : "text-gray-400"}`}>
                    {atrasado ? "⚠️ Atrasado · " : ""}Prazo: {fmtDate(m.dueDate)}
                  </p>
                )}
                {concluido && m.completedAt && <p className="text-xs text-green-600 mt-0.5">✓ Concluído em {fmtDate(m.completedAt)}</p>}
              </div>
              <button onClick={() => { if (confirm("Excluir marco?")) deleteMut.mutate({ id: m.id }); }}
                className="text-gray-300 hover:text-red-400 text-lg leading-none flex-shrink-0">×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Aba: Diário de Obra ──────────────────────────────────────────────────────

function AbaDiario({ project, refetch }: { project: any; refetch: () => void }) {
  const createMut = trpc.projects.createLog.useMutation({ onSuccess: () => { setForm({ date: today, description: "", weather: "", workers: "" }); setAdding(false); refetch(); } });
  const deleteMut = trpc.projects.deleteLog.useMutation({ onSuccess: refetch });

  const today = new Date().toISOString().split("T")[0];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: today, description: "", weather: "", workers: "" });

  const logs = project.logs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{logs.length} registro{logs.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setAdding(true)}
          className="px-3 py-1.5 bg-[#F5A623] text-white text-xs font-semibold rounded-lg hover:bg-[#F7BB52] transition">
          + Novo Registro
        </button>
      </div>

      {adding && (
        <div className="bg-white border border-[#1A1A1A]/30 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            <select value={form.weather} onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30">
              <option value="">Clima...</option>
              {WEATHER_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
            <input type="number" value={form.workers} onChange={(e) => setForm((f) => ({ ...f, workers: e.target.value }))}
              placeholder="Nº trabalhadores"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
          </div>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descrição das atividades do dia *" rows={3} autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => { if (!form.description) return; createMut.mutate({ projectId: project.id, date: form.date, description: form.description, weather: form.weather || undefined, workers: form.workers ? parseInt(form.workers) : undefined }); }}
              disabled={createMut.isPending}
              className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-50">
              Salvar
            </button>
          </div>
        </div>
      )}

      {logs.length === 0 && !adding ? (
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">
          <p className="font-medium">Nenhum registro no diário.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => {
            const weather = WEATHER_OPTIONS.find((w) => w.value === log.weather);
            return (
              <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#1A1A1A]">{fmtDate(log.date)}</span>
                    {weather && <span className="text-sm">{weather.label}</span>}
                    {log.workers != null && <span className="text-xs text-gray-400">{log.workers} trabalhadores</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{log.user?.name}</span>
                    <button onClick={() => { if (confirm("Excluir registro?")) deleteMut.mutate({ id: log.id }); }}
                      className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line">{log.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Aba: Checklists ──────────────────────────────────────────────────────────

function AbaChecklists({ project, refetch }: { project: any; refetch: () => void }) {
  const createChecklistMut = trpc.projects.createChecklist.useMutation({ onSuccess: () => { setNovoNome(""); setAddingChecklist(false); refetch(); } });
  const deleteChecklistMut = trpc.projects.deleteChecklist.useMutation({ onSuccess: refetch });
  const toggleItemMut = trpc.projects.toggleChecklistItem.useMutation({ onSuccess: refetch });
  const addItemMut = trpc.projects.addChecklistItem.useMutation({ onSuccess: () => { setNovoItem((f) => ({ ...f, text: "" })); refetch(); } });
  const deleteItemMut = trpc.projects.deleteChecklistItem.useMutation({ onSuccess: refetch });

  const [addingChecklist, setAddingChecklist] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoItem, setNovoItem] = useState<{ checklistId: string; text: string }>({ checklistId: "", text: "" });

  const checklists = project.checklists ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{checklists.length} checklist{checklists.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setAddingChecklist(true)}
          className="px-3 py-1.5 bg-[#F5A623] text-white text-xs font-semibold rounded-lg hover:bg-[#F7BB52] transition">
          + Nova Lista
        </button>
      </div>

      {addingChecklist && (
        <div className="bg-white border border-[#1A1A1A]/30 rounded-xl p-4 flex gap-2">
          <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} autoFocus
            placeholder="Nome da checklist..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
          <button onClick={() => setAddingChecklist(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { if (!novoNome) return; createChecklistMut.mutate({ projectId: project.id, name: novoNome }); }}
            disabled={createChecklistMut.isPending}
            className="px-3 py-2 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-50">
            Criar
          </button>
        </div>
      )}

      {checklists.length === 0 && !addingChecklist && (
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">
          <p className="font-medium">Nenhuma checklist cadastrada.</p>
        </div>
      )}

      {checklists.map((cl: any) => {
        const items = cl.items ?? [];
        const done = items.filter((i: any) => i.completed).length;
        const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
        return (
          <div key={cl.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A]/5 border-b border-gray-200">
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-900">{cl.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{done}/{items.length} itens · {pct}%</p>
              </div>
              <button onClick={() => { if (confirm("Excluir esta checklist?")) deleteChecklistMut.mutate({ id: cl.id }); }}
                className="text-gray-300 hover:text-red-400 text-lg leading-none ml-2">×</button>
            </div>

            <div className="divide-y divide-gray-100">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button onClick={() => toggleItemMut.mutate({ id: item.id, completed: !item.completed })}
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${item.completed ? "bg-[#1A1A1A] border-[#1A1A1A]" : "border-gray-300 hover:border-[#1A1A1A]"}`}>
                    {item.completed && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>}
                  </button>
                  <span className={`flex-1 text-sm ${item.completed ? "line-through text-gray-400" : "text-gray-700"}`}>{item.description}</span>
                  <button onClick={() => deleteItemMut.mutate({ id: item.id })}
                    className="text-gray-200 hover:text-red-400 text-base leading-none flex-shrink-0">×</button>
                </div>
              ))}
            </div>

            {/* Adicionar item */}
            <div className="px-4 py-2.5 border-t border-gray-100">
              {novoItem.checklistId === cl.id ? (
                <div className="flex gap-2">
                  <input value={novoItem.text} onChange={(e) => setNovoItem((f) => ({ ...f, text: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && novoItem.text) addItemMut.mutate({ checklistId: cl.id, description: novoItem.text, sortOrder: items.length }); if (e.key === "Escape") setNovoItem({ checklistId: "", text: "" }); }}
                    placeholder="Novo item..." autoFocus
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
                  <button onClick={() => { if (novoItem.text) addItemMut.mutate({ checklistId: cl.id, description: novoItem.text, sortOrder: items.length }); }}
                    className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2C2C]">
                    Add
                  </button>
                </div>
              ) : (
                <button onClick={() => setNovoItem({ checklistId: cl.id, text: "" })}
                  className="text-xs text-gray-400 hover:text-[#1A1A1A] font-medium transition">
                  + Adicionar item
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Aba: Documentos ─────────────────────────────────────────────────────────

const DOC_STATUS_CONFIG = {
  a_iniciar:         { label: "A Iniciar",          color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400" },
  previa:            { label: "Prévia",              color: "bg-purple-50 text-purple-700", dot: "bg-purple-400" },
  em_producao:       { label: "Em Produção",         color: "bg-blue-50 text-blue-700",     dot: "bg-blue-500" },
  em_revisao:        { label: "Em Revisão",          color: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  em_conferencia:    { label: "Em Conferência",      color: "bg-orange-50 text-orange-700", dot: "bg-orange-400" },
  liberado_para_obra:{ label: "Liberado p/ Obra",    color: "bg-teal-50 text-teal-700",     dot: "bg-teal-500" },
  finalizado:        { label: "Finalizado",          color: "bg-green-50 text-green-700",   dot: "bg-green-500" },
  superado:          { label: "Superado",            color: "bg-gray-100 text-gray-400",    dot: "bg-gray-300" },
} as const;

const DOC_PRIORITY_CONFIG = {
  baixa:          { label: "Baixa",             color: "text-gray-400 bg-gray-50 border-gray-200" },
  media:          { label: "Média",             color: "text-blue-600 bg-blue-50 border-blue-200" },
  alta:           { label: "Alta",              color: "text-orange-600 bg-orange-50 border-orange-200" },
  urgente:        { label: "Urgente",           color: "text-red-600 bg-red-50 border-red-200" },
  prazo_a_definir:{ label: "Prazo a definir",   color: "text-gray-500 bg-gray-50 border-gray-200" },
} as const;

const DOC_TYPE_LABELS: Record<string, string> = {
  art: "ART", rrt: "RRT", memorial_descritivo: "Memorial Descritivo",
  contrato: "Contrato", planilha_calculo: "Planilha de Cálculo",
  prancha_pdf: "Prancha PDF", link_externo: "Link Externo", outro: "Outro",
};

type DocStatus = keyof typeof DOC_STATUS_CONFIG;
type DocPriority = keyof typeof DOC_PRIORITY_CONFIG;

const STATUS_ORDER: DocStatus[] = ["a_iniciar", "previa", "em_producao", "em_revisao", "em_conferencia", "liberado_para_obra", "finalizado"];
// superado fica fora do Kanban principal — vai para a pasta Superados

function ModalDoc({
  projectId, doc, onClose, onSuccess,
}: { projectId: string; doc?: any; onClose: () => void; onSuccess: () => void }) {
  const createMut = trpc.docs.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const updateMut = trpc.docs.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const [form, setForm] = useState({
    name: doc?.name ?? "",
    type: doc?.type ?? "prancha_pdf",
    description: doc?.description ?? "",
    linkExterno: doc?.linkExterno ?? "",
    status: doc?.status ?? "a_iniciar",
    priority: doc?.priority ?? "media",
    version: doc?.version ?? "",
    dueDate: doc?.dueDate ? new Date(doc.dueDate).toISOString().split("T")[0] : "",
    assignedTo: doc?.assignedTo ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    const payload = {
      ...form,
      type: form.type as any,
      status: form.status as any,
      priority: form.priority as any,
      linkExterno: form.linkExterno || undefined,
      version: form.version || undefined,
      dueDate: form.dueDate || undefined,
      assignedTo: form.assignedTo || undefined,
      description: form.description || undefined,
    };
    if (doc) {
      updateMut.mutate({ id: doc.id, ...payload });
    } else {
      createMut.mutate({ projectId, ...payload });
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">{doc ? "Editar Documento" : "Novo Documento"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus
              placeholder="Ex: Prancha Estrutural P-01"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30">
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Versão</label>
              <input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                placeholder="Ex: v1.0, Rev. A"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30">
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{DOC_STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Prioridade</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30">
                {(Object.keys(DOC_PRIORITY_CONFIG) as DocPriority[]).map((p) => <option key={p} value={p}>{DOC_PRIORITY_CONFIG[p].label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Prazo</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Responsável</label>
              <input value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                placeholder="Nome do responsável"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Link (Google Drive / OneDrive)</label>
            <input value={form.linkExterno} onChange={(e) => setForm((f) => ({ ...f, linkExterno: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descrição</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 px-4 py-2 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50">
              {isPending ? "Salvando..." : doc ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AbaDocumentos({
  projectId,
  folderUrl: initialFolderUrl,
  refetch,
}: {
  projectId: string;
  folderUrl?: string | null;
  refetch: () => void;
}) {
  const { data: docs, refetch: refetchDocs } = trpc.docs.listByProject.useQuery({ projectId });
  const updateStatusMut = trpc.docs.updateStatus.useMutation({ onSuccess: () => { refetchDocs(); refetch(); } });
  const deleteMut = trpc.docs.delete.useMutation({ onSuccess: () => { refetchDocs(); refetch(); } });
  const updateProjectMut = trpc.projects.update.useMutation({ onSuccess: () => { refetch(); setEditingFolder(false); } });

  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [showUpload, setShowUpload] = useState(false);
  const [superadosOpen, setSuperadosOpen] = useState(false);

  // Diretório
  const [editingFolder, setEditingFolder] = useState(false);
  const [folderInput, setFolderInput] = useState(initialFolderUrl ?? "");

  function handleSuccess() { refetchDocs(); refetch(); }

  // Docs ativos (excluindo superados)
  const activeDocs = docs?.filter((d) => d.status !== "superado") ?? [];
  const superadoDocs = docs?.filter((d) => d.status === "superado") ?? [];

  const byStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = activeDocs.filter((d) => d.status === s);
    return acc;
  }, {} as Record<DocStatus, any[]>);

  // Render de card de documento (compartilhado entre Kanban e Superados)
  function DocCard({ doc, isSuperado = false }: { doc: any; isSuperado?: boolean }) {
    const pCfg = DOC_PRIORITY_CONFIG[doc.priority as DocPriority] ?? DOC_PRIORITY_CONFIG.media;
    const atrasado = doc.dueDate && doc.status !== "finalizado" && new Date(doc.dueDate) < new Date();
    return (
      <div className={`bg-white border rounded-xl p-3 hover:shadow-sm transition group ${isSuperado ? "border-gray-200 opacity-70 hover:opacity-100" : "border-gray-200"}`}>
        <div className="flex items-start justify-between gap-1 mb-2">
          <p className="font-semibold text-xs text-gray-900 leading-tight flex-1">{doc.name}</p>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
            {!isSuperado && (
              <button onClick={() => { setEditingDoc(doc); setShowModal(true); }} className="text-gray-300 hover:text-[#1A1A1A] text-sm">✏️</button>
            )}
            <button onClick={() => { if (confirm("Excluir?")) deleteMut.mutate({ id: doc.id }); }} className="text-gray-300 hover:text-red-400 text-sm">×</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs text-gray-400">{DOC_TYPE_LABELS[doc.type]}</span>
          {doc.version && <span className="text-xs text-[#1A1A1A] font-semibold">{doc.version}</span>}
        </div>
        <span className={`inline-flex text-xs font-semibold px-1.5 py-0.5 rounded border ${pCfg.color}`}>{pCfg.label}</span>
        {doc.dueDate && (
          <p className={`text-xs mt-1.5 ${atrasado ? "text-red-500 font-semibold" : "text-gray-400"}`}>
            {atrasado ? "⚠️ " : ""}Prazo: {fmtDate(doc.dueDate)}
          </p>
        )}
        {doc.assignedTo && <p className="text-xs text-gray-400 mt-0.5">👤 {doc.assignedTo}</p>}
        {(doc.linkExterno || doc.storagePath) && (
          <a
            href={doc.linkExterno || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documentos-tecnicos/${doc.storagePath}`}
            target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 flex items-center gap-1 text-xs text-[#1A1A1A] hover:underline font-medium">
            {doc.storagePath ? "📄 Baixar arquivo" : "🔗 Abrir link"}
          </a>
        )}
        {isSuperado ? (
          /* Restaurar da pasta Superados */
          <button
            onClick={() => updateStatusMut.mutate({ id: doc.id, status: "a_iniciar" })}
            className="mt-2 w-full text-xs border border-[#1A1A1A]/30 text-[#1A1A1A] rounded px-1.5 py-1 hover:bg-[#1A1A1A]/8 transition font-semibold">
            ↩ Restaurar
          </button>
        ) : (
          /* Select de status — inclui opção Superado */
          <select value={doc.status}
            onChange={(e) => updateStatusMut.mutate({ id: doc.id, status: e.target.value as DocStatus })}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30 bg-gray-50">
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{DOC_STATUS_CONFIG[s].label}</option>)}
            <option value="superado">— Mover para Superados</option>
          </select>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header: contagem + Diretório + view toggle + botões */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-gray-500 shrink-0">{activeDocs.length} documento{activeDocs.length !== 1 ? "s" : ""}</p>

          {/* ── Diretório ── */}
          {editingFolder ? (
            <div className="flex items-center gap-1 flex-wrap">
              <input
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="https://drive.google.com/..."
                autoFocus
                className="border border-[#1A1A1A]/40 rounded-lg px-2 py-1 text-xs w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
              />
              <button
                onClick={() => {
                  updateProjectMut.mutate({ id: projectId, folderUrl: folderInput || null });
                }}
                disabled={updateProjectMut.isPending}
                className="px-2.5 py-1 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2C2C] transition disabled:opacity-50">
                Salvar
              </button>
              <button onClick={() => { setEditingFolder(false); setFolderInput(initialFolderUrl ?? ""); }}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition">
                ✕
              </button>
            </div>
          ) : initialFolderUrl ? (
            <div className="flex items-center gap-1 bg-[#1A1A1A]/8 px-2.5 py-1 rounded-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <a href={initialFolderUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold text-[#1A1A1A] hover:underline">
                Diretório
              </a>
              <button onClick={() => { setEditingFolder(true); setFolderInput(initialFolderUrl); }}
                className="text-gray-400 hover:text-[#1A1A1A] ml-1 transition" title="Editar link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingFolder(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Diretório
            </button>
          )}

          {/* Toggle Kanban/Lista */}
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
            <button onClick={() => setViewMode("kanban")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${viewMode === "kanban" ? "bg-white text-[#1A1A1A] shadow-sm" : "text-gray-500"}`}>
              Kanban
            </button>
            <button onClick={() => setViewMode("lista")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${viewMode === "lista" ? "bg-white text-[#1A1A1A] shadow-sm" : "text-gray-500"}`}>
              Lista
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUpload(true)}
            className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2C2C] transition flex items-center gap-1">
            ↑ Upload de Arquivos
          </button>
          <button onClick={() => { setEditingDoc(null); setShowModal(true); }}
            className="px-3 py-1.5 bg-[#F5A623] text-white text-xs font-semibold rounded-lg hover:bg-[#F7BB52] transition">
            + Link / Manual
          </button>
        </div>
      </div>

      {/* Upload múltiplo */}
      {showUpload && (
        <div className="mb-4">
          <UploadMultiplo
            projectId={projectId}
            onSuccess={() => { setShowUpload(false); handleSuccess(); }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {viewMode === "kanban" ? (
        /* ── Kanban ── */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUS_ORDER.map((status) => {
            const cfg = DOC_STATUS_CONFIG[status];
            const items = byStatus[status];
            return (
              <div key={status} className="flex-shrink-0 w-56">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{cfg.label}</span>
                  <span className="ml-auto text-xs text-gray-400 font-semibold">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((doc) => <DocCard key={doc.id} doc={doc} />)}
                  {items.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-400">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Lista ── */
        <div className="space-y-2">
          {!activeDocs.length && (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">
              <p className="font-medium">Nenhum documento cadastrado.</p>
            </div>
          )}
          {activeDocs.map((doc) => {
            const sCfg = DOC_STATUS_CONFIG[doc.status as DocStatus] ?? DOC_STATUS_CONFIG.a_iniciar;
            const pCfg = DOC_PRIORITY_CONFIG[doc.priority as DocPriority] ?? DOC_PRIORITY_CONFIG.media;
            const atrasado = doc.dueDate && doc.status !== "finalizado" && new Date(doc.dueDate) < new Date();
            return (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:shadow-sm transition group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-gray-900 truncate">{doc.name}</p>
                    {doc.version && <span className="text-xs text-[#1A1A1A] font-bold flex-shrink-0">{doc.version}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{DOC_TYPE_LABELS[doc.type]}</span>
                    {doc.assignedTo && <><span>·</span><span>👤 {doc.assignedTo}</span></>}
                    {doc.dueDate && <><span>·</span><span className={atrasado ? "text-red-500 font-semibold" : ""}>{atrasado ? "⚠️ " : ""}Prazo: {fmtDate(doc.dueDate)}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={doc.status}
                    onChange={(e) => updateStatusMut.mutate({ id: doc.id, status: e.target.value as DocStatus })}
                    className="text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-500 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30">
                    {STATUS_ORDER.map((s) => <option key={s} value={s}>{DOC_STATUS_CONFIG[s].label}</option>)}
                    <option value="superado">— Mover para Superados</option>
                  </select>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${pCfg.color}`}>{pCfg.label}</span>
                  {doc.linkExterno && (
                    <a href={doc.linkExterno} target="_blank" rel="noopener noreferrer"
                      className="text-[#1A1A1A] hover:underline text-xs font-medium">🔗</a>
                  )}
                  <button onClick={() => { setEditingDoc(doc); setShowModal(true); }}
                    className="text-gray-300 hover:text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition">✏️</button>
                  <button onClick={() => { if (confirm("Excluir?")) deleteMut.mutate({ id: doc.id }); }}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition">×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pasta Superados ── */}
      {(superadoDocs.length > 0 || true) && (
        <div className="mt-6 border border-dashed border-gray-300 rounded-xl overflow-hidden">
          <button
            onClick={() => setSuperadosOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Superados</span>
              <span className="text-xs text-gray-400 font-semibold">
                {superadoDocs.length} doc{superadoDocs.length !== 1 ? "s" : ""}
              </span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`w-4 h-4 text-gray-400 transition-transform ${superadosOpen ? "" : "-rotate-90"}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {superadosOpen && (
            <div className="p-4">
              {superadoDocs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  Nenhum documento superado. Use "Mover para Superados" nos cards acima.
                </p>
              ) : viewMode === "kanban" ? (
                <div className="flex flex-wrap gap-3">
                  {superadoDocs.map((doc) => (
                    <div key={doc.id} className="w-56 shrink-0">
                      <DocCard doc={doc} isSuperado />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {superadoDocs.map((doc) => {
                    const pCfg = DOC_PRIORITY_CONFIG[doc.priority as DocPriority] ?? DOC_PRIORITY_CONFIG.media;
                    return (
                      <div key={doc.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 opacity-70 hover:opacity-100 transition group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm text-gray-600 truncate">{doc.name}</p>
                            {doc.version && <span className="text-xs text-gray-400 font-bold flex-shrink-0">{doc.version}</span>}
                          </div>
                          <span className="text-xs text-gray-400">{DOC_TYPE_LABELS[doc.type]}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${pCfg.color}`}>{pCfg.label}</span>
                          {doc.linkExterno && (
                            <a href={doc.linkExterno} target="_blank" rel="noopener noreferrer"
                              className="text-[#1A1A1A] hover:underline text-xs font-medium">🔗</a>
                          )}
                          <button
                            onClick={() => updateStatusMut.mutate({ id: doc.id, status: "a_iniciar" })}
                            className="text-xs border border-[#1A1A1A]/30 text-[#1A1A1A] rounded px-2 py-1 hover:bg-[#1A1A1A]/8 transition font-semibold opacity-0 group-hover:opacity-100">
                            ↩ Restaurar
                          </button>
                          <button onClick={() => { if (confirm("Excluir?")) deleteMut.mutate({ id: doc.id }); }}
                            className="text-gray-300 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition">×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ModalDoc
          projectId={projectId}
          doc={editingDoc}
          onClose={() => { setShowModal(false); setEditingDoc(null); }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

type Tab = "geral" | "marcos" | "diario" | "checklists" | "documentos" | "arquivos_recebidos";

// ─── Aba: Arquivos Recebidos ──────────────────────────────────────────────────

function AbaArquivosRecebidos({ projectId }: { projectId: string }) {
  const { data: files, refetch } = trpc.clientFiles.listByProject.useQuery({ projectId });
  const deleteMut = trpc.clientFiles.delete.useMutation({ onSuccess: () => refetch() });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  function fmtSize(bytes: number | null | undefined) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-[#F5A623]/10 rounded-lg flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" className="w-4 h-4">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Arquivos Recebidos do Cliente</p>
          <p className="text-xs text-gray-400">Documentos enviados pelo cliente para este projeto</p>
        </div>
        <span className="ml-auto text-xs bg-[#F5A623]/10 text-[#F5A623] font-bold px-2 py-0.5 rounded-full">
          {files?.length ?? 0}
        </span>
      </div>

      {!files?.length ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="w-10 h-10 mx-auto mb-3">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p className="text-gray-400 text-sm">Nenhum arquivo enviado pelo cliente ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:shadow-sm transition group">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" className="w-4 h-4">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{(file as any).client?.company || (file as any).client?.name}</span>
                  <span>·</span>
                  <span>{fmtSize(file.fileSize)}</span>
                  <span>·</span>
                  <span>{new Date(file.uploadedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition">
                <a
                  href={`${SUPABASE_URL}/storage/v1/object/public/arquivos-recebidos/${file.storagePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/8 rounded-lg transition"
                  title="Baixar arquivo"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
                <button
                  onClick={() => { if (confirm(`Excluir "${file.name}"?`)) deleteMut.mutate({ id: file.id }); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Excluir"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjetoDetalhe() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: session } = useSession();
  const isClient = (session?.user as any)?.role === "client";
  const isAdmin = (session?.user as any)?.role === "admin";
  const { data: project, isLoading, refetch } = trpc.projects.getById.useQuery({ id }, { enabled: !!id });
  const { data: clientFilesCount } = trpc.clientFiles.listByProject.useQuery({ projectId: id }, { enabled: !!id && !isClient });
  const [tab, setTab] = useState<Tab>("geral");
  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => router.push("/projetos"),
    onError: (e) => alert(e.message),
  });

  if (isLoading) return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  if (!project) return <div className="text-center py-20 text-gray-400">Projeto não encontrado.</div>;

  const cfgStatus = STATUS_CONFIG[project.status as ProjectStatus] ?? STATUS_CONFIG.aguardando_inicio;
  const milestones = project.milestones ?? [];
  const progresso = milestones.length > 0
    ? Math.round((milestones.filter((m) => m.completedAt).length / milestones.length) * 100)
    : 0;

  const arquivosCount = clientFilesCount?.length ?? 0;
  const TABS: { key: Tab; label: string }[] = [
    { key: "geral", label: "Visão Geral" },
    { key: "documentos", label: `Documentos (${project.technicalDocs?.length ?? 0})` },
    { key: "marcos", label: `Marcos (${milestones.length})` },
    { key: "diario", label: `Diário (${project.logs?.length ?? 0})` },
    { key: "checklists", label: `Checklists (${project.checklists?.length ?? 0})` },
    ...(!isClient ? [{ key: "arquivos_recebidos" as Tab, label: `Arquivos Recebidos${arquivosCount > 0 ? ` (${arquivosCount})` : ""}` }] : []),
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <button onClick={() => router.push("/projetos")} className="hover:text-[#1A1A1A] transition">Projetos</button>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">{project.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="text-sm font-bold text-[#F5A623]">{project.code}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfgStatus.color}`}>{cfgStatus.label}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 uppercase tracking-wide">{project.name}</h1>
            <p className="text-gray-400 text-sm mt-1">{project.client?.company || project.client?.name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">Contrato</p>
            <p className="text-lg font-extrabold text-gray-900">{fmt(Number(project.contractValue))}</p>
            {isAdmin && (
              <button
                onClick={() => {
                  if (confirm(`Excluir o projeto "${project.name}" (${project.code})? Isso remove marcos, diário, checklists, documentos e parcelas vinculados. Esta ação não pode ser desfeita.`)) {
                    deleteProject.mutate({ id: project.id });
                  }
                }}
                disabled={deleteProject.isPending}
                className="mt-2 text-[11px] text-red-500 hover:text-red-700 hover:underline font-medium disabled:opacity-50"
              >
                🗑 Excluir projeto
              </button>
            )}
          </div>
        </div>

        {milestones.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progresso dos marcos</span><span>{progresso}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#1A1A1A] rounded-full transition-all" style={{ width: `${progresso}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${tab === t.key ? "bg-white text-[#1A1A1A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {tab === "geral"              && <AbaVisaoGeral project={project} refetch={refetch} />}
      {tab === "documentos"         && <AbaDocumentos projectId={project.id} folderUrl={(project as any).folderUrl} refetch={refetch} />}
      {tab === "marcos"             && <AbaMarcos project={project} refetch={refetch} />}
      {tab === "diario"             && <AbaDiario project={project} refetch={refetch} />}
      {tab === "checklists"         && <AbaChecklists project={project} refetch={refetch} />}
      {tab === "arquivos_recebidos" && !isClient && <AbaArquivosRecebidos projectId={project.id} />}
    </div>
  );
}
