"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/trpc/client";
import { formatCurrency } from "@/lib/utils";
import { type LeadStatus } from "@prisma/client";

const STATUS_COLORS: Record<string, { badge: string; col: string }> = {
  contato_inicial:     { badge: "bg-gray-100 text-gray-600",        col: "border-gray-300" },
  visita_tecnica:      { badge: "bg-blue-100 text-blue-700",         col: "border-blue-400" },
  elaboracao_proposta: { badge: "bg-orange-100 text-[#F5A623]",      col: "border-[#F5A623]" },
  negociacao:          { badge: "bg-yellow-100 text-yellow-700",     col: "border-yellow-500" },
  fechado_ganho:       { badge: "bg-green-100 text-green-700",       col: "border-green-500" },
  proposta_declinada:  { badge: "bg-purple-100 text-purple-700",     col: "border-purple-400" },
  perdido:             { badge: "bg-red-100 text-red-500",           col: "border-red-400" },
};

const STATUS_LABELS: Record<string, string> = {
  contato_inicial: "Contato Inicial",
  visita_tecnica: "Visita Técnica",
  elaboracao_proposta: "Elab. Proposta",
  negociacao: "Negociação",
  fechado_ganho: "Fechado ✓",
  proposta_declinada: "Declinado / Perdido",
  perdido: "Perdido",
};

// "perdido" está unificado com "proposta_declinada" na UI
const COLUMN_ORDER: LeadStatus[] = [
  "contato_inicial","visita_tecnica","elaboracao_proposta","negociacao","fechado_ganho","proposta_declinada",
];

const NEXT_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  contato_inicial: "visita_tecnica",
  visita_tecnica: "elaboracao_proposta",
  elaboracao_proposta: "negociacao",
  negociacao: "fechado_ganho",
};

const PREV_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  visita_tecnica: "contato_inicial",
  elaboracao_proposta: "visita_tecnica",
  negociacao: "elaboracao_proposta",
  fechado_ganho: "negociacao",
};

// Opções de reativação para leads declinados
const REACTIVATE_OPTIONS: { status: LeadStatus; label: string }[] = [
  { status: "contato_inicial", label: "Contato Inicial" },
  { status: "elaboracao_proposta", label: "Elab. Proposta" },
  { status: "negociacao", label: "Negociação" },
];

const SERVICE_TYPES = [
  "Alvenaria Estrutural","Concreto Armado","Edifício Comercial Pré-moldado",
  "Expansão Industrial","Estrutura Metálica","Cobertura Metálica",
  "Galpão","Muro de Gabião","Fundação","Reforma Estrutural",
  "Demolição","Movimentação de Terra","Caminhões de Retirada de Terra","Locação de Máquina",
  "Outro",
];

const SERVICE_BADGE: Record<string, string> = {
  "Estrutura Metálica":  "bg-blue-100 text-blue-700",
  "Cobertura Metálica":  "bg-blue-100 text-blue-700",
  "Alvenaria Estrutural":"bg-purple-100 text-purple-700",
  "Concreto Armado":     "bg-purple-100 text-purple-700",
  "Edifício Comercial Pré-moldado": "bg-[#1A1A1A]/10 text-[#1A1A1A]",
  "Expansão Industrial": "bg-orange-100 text-orange-700",
  "Galpão":              "bg-[#1A1A1A]/10 text-[#1A1A1A]",
  "Muro de Gabião":      "bg-green-100 text-green-700",
  "Fundação":            "bg-yellow-100 text-yellow-700",
  "Demolição":           "bg-red-100 text-red-700",
  "Movimentação de Terra": "bg-amber-100 text-amber-700",
  "Caminhões de Retirada de Terra": "bg-amber-100 text-amber-700",
  "Locação de Máquina":  "bg-teal-100 text-teal-700",
};

type ProposalData = {
  id: string; code: string; status: string; totalValue: unknown;
};

type LeadData = {
  id: string; title: string; clientId: string;
  serviceType: string | null; estimatedValue: unknown;
  priority: number; notes: string | null;
  client: { name: string; company: string | null };
  proposals?: ProposalData[];
};

function ProjectCodeBadge({ projectId, code, onUpdated }: { projectId: string; code: string; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(code);
  const update = trpc.projects.update.useMutation({
    onSuccess: () => { onUpdated(); setEditing(false); },
  });

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          className="text-[10px] font-bold font-mono border border-[#1A1A1A]/40 rounded px-1.5 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
          autoFocus
          onKeyDown={e => {
            if (e.key === "Enter" && val.trim()) update.mutate({ id: projectId, code: val.trim() });
            if (e.key === "Escape") { setVal(code); setEditing(false); }
          }}
        />
        <button
          onClick={() => val.trim() && update.mutate({ id: projectId, code: val.trim() })}
          disabled={update.isPending}
          className="text-[10px] font-bold text-white bg-[#1A1A1A] px-1.5 py-0.5 rounded hover:bg-[#0a3a37] disabled:opacity-50"
        >
          {update.isPending ? "…" : "OK"}
        </button>
        <button onClick={() => { setVal(code); setEditing(false); }} className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
      </div>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Clique para editar o código"
      className="text-[10px] font-bold font-mono text-[#1A1A1A] bg-[#1A1A1A]/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-[#1A1A1A]/20 transition"
    >
      {code} <span className="opacity-40">✏</span>
    </span>
  );
}

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  rascunho:       "bg-gray-100 text-gray-500",
  enviada:        "bg-blue-100 text-blue-700",
  em_negociacao:  "bg-yellow-100 text-yellow-700",
  aprovada:       "bg-green-100 text-green-700",
  recusada:       "bg-red-100 text-red-500",
  cancelada:      "bg-gray-100 text-gray-400",
};
const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho", enviada: "Enviada", em_negociacao: "Negociação",
  aprovada: "Aprovada", recusada: "Recusada", cancelada: "Cancelada",
};

function ProposalBadge({ proposal, onUpdated }: { proposal: ProposalData; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(proposal.code);
  const patchCode = trpc.proposals.patchCode.useMutation({
    onSuccess: () => { onUpdated(); setEditing(false); },
  });

  const canEdit = !["aprovada", "recusada", "cancelada"].includes(proposal.status);

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          className="text-xs border border-[#1A1A1A]/40 rounded px-1.5 py-0.5 font-mono w-28 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
          autoFocus
          onKeyDown={e => {
            if (e.key === "Enter" && code.trim()) patchCode.mutate({ id: proposal.id, code: code.trim() });
            if (e.key === "Escape") { setCode(proposal.code); setEditing(false); }
          }}
        />
        <button
          onClick={() => code.trim() && patchCode.mutate({ id: proposal.id, code: code.trim() })}
          disabled={patchCode.isPending || !code.trim()}
          className="text-[10px] font-bold text-white bg-[#1A1A1A] px-1.5 py-0.5 rounded hover:bg-[#0a3a37] disabled:opacity-50"
        >
          {patchCode.isPending ? "…" : "OK"}
        </button>
        <button onClick={() => { setCode(proposal.code); setEditing(false); }} className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      <span
        onClick={canEdit ? () => setEditing(true) : undefined}
        title={canEdit ? "Clique para editar o código" : undefined}
        className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#1A1A1A]/10 text-[#1A1A1A] ${canEdit ? "cursor-pointer hover:bg-[#1A1A1A]/20 transition" : ""}`}
      >
        {proposal.code}{canEdit && <span className="ml-1 opacity-40">✏</span>}
      </span>
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PROPOSAL_STATUS_COLORS[proposal.status] ?? "bg-gray-100 text-gray-500"}`}>
        {PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status}
      </span>
    </div>
  );
}

// ── Modal Novo Lead ──────────────────────────────────────────
function LeadModal({
  mode,
  lead,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  lead?: LeadData;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    clientId: lead?.clientId ?? "",
    title: lead?.title ?? "",
    serviceType: lead?.serviceType ?? "",
    serviceTypeCustom: "",
    estimatedValue: lead?.estimatedValue ? String(lead.estimatedValue) : "",
    priority: String(lead?.priority ?? 2),
    notes: lead?.notes ?? "",
  });
  const [error, setError] = useState("");
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100 });
  const clients = clientsData?.items ?? [];

  const createLead = trpc.leads.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); }, onError: e => setError(e.message) });
  const updateLead = trpc.leads.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); }, onError: e => setError(e.message) });

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceType = form.serviceType === "Outro" ? (form.serviceTypeCustom || "Outro") : (form.serviceType || undefined);
    if (mode === "create") {
      if (!form.clientId) { setError("Selecione um cliente."); return; }
      createLead.mutate({ clientId: form.clientId, title: form.title, serviceType, estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined, priority: parseInt(form.priority), notes: form.notes || undefined });
    } else {
      updateLead.mutate({ id: lead!.id, title: form.title, serviceType: serviceType ?? null, estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null, priority: parseInt(form.priority), notes: form.notes || null });
    }
  };

  const isPending = createLead.isPending || updateLead.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">{mode === "create" ? "Novo Lead" : "Editar Lead"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {mode === "create" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cliente *</label>
              {clients.length === 0
                ? <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-3 py-2">Cadastre um cliente primeiro.</div>
                : <select required value={form.clientId} onChange={e => f("clientId", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]">
                    <option value="">Selecione o cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
                  </select>}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Título do Serviço *</label>
            <input required value={form.title} onChange={e => f("title", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Ex: Cobertura Metálica — Galpão Industrial SP" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo de Serviço</label>
            <select value={form.serviceType} onChange={e => f("serviceType", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]">
              <option value="">Selecione...</option>
              {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
            {form.serviceType === "Outro" && (
              <input autoFocus value={form.serviceTypeCustom} onChange={e => f("serviceTypeCustom", e.target.value)} className="w-full mt-2 px-3 py-2 rounded-lg border border-[#1A1A1A] bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Descreva o tipo de serviço..." />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Valor Estimado (R$)</label>
              <input type="number" min="0" step="0.01" value={form.estimatedValue} onChange={e => f("estimatedValue", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Prioridade</label>
              <select value={form.priority} onChange={e => f("priority", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]">
                <option value="1">🔴 Alta</option>
                <option value="2">🟡 Normal</option>
                <option value="3">🟢 Baixa</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
            <textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] resize-none" placeholder="Informações adicionais..." />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isPending || (mode === "create" && clients.length === 0)} className="flex-1 py-2.5 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg disabled:opacity-60">
              {isPending ? "Salvando..." : mode === "create" ? "Criar Lead" : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Converter em Projeto ───────────────────────────────
function ConverterProjetoModal({ lead, onClose, onSuccess }: { lead: LeadData; onClose: () => void; onSuccess: () => void }) {
  const [contractValue, setContractValue] = useState(String(lead.estimatedValue ?? ""));
  const [parcelas, setParcelas] = useState([
    { description: "Sinal", pct: 30 },
    { description: "Medição 1", pct: 40 },
    { description: "Entrega Final", pct: 30 },
  ]);
  const [saved, setSaved] = useState(false);
  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => { setSaved(true); onSuccess(); setTimeout(onClose, 800); },
  });
  const total = parseFloat(contractValue) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Converter em Projeto</h2>
            <p className="text-xs text-gray-400 mt-0.5">{lead.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Valor do Contrato (R$) *</label>
            <input type="number" min="0" step="0.01" value={contractValue} onChange={e => setContractValue(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Parcelas</label>
              <button type="button" onClick={() => setParcelas(p => [...p, { description: `Parcela ${p.length + 1}`, pct: 0 }])} className="text-xs text-[#1A1A1A] font-semibold hover:underline">+ Adicionar</button>
            </div>
            <div className="space-y-2">
              {parcelas.map((p, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <input value={p.description} onChange={e => setParcelas(ps => ps.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Descrição" />
                  <input type="number" min="0" max="100" value={p.pct} onChange={e => setParcelas(ps => ps.map((x, j) => j === i ? { ...x, pct: parseInt(e.target.value) || 0 } : x))} className="w-16 px-2 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
                  <span className="text-gray-400 text-sm">%</span>
                  <div className="text-xs text-gray-400 w-20 sm:w-24 text-right">{total > 0 ? formatCurrency(Math.round((p.pct / 100) * total * 100) / 100) : "—"}</div>
                  <button onClick={() => setParcelas(ps => ps.filter((_, j) => j !== i))} className="text-red-300 hover:text-red-500 text-lg">×</button>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs mt-1 px-1">
              <span className="text-gray-400">Total: {parcelas.reduce((s, p) => s + p.pct, 0)}%</span>
              <span className={parcelas.reduce((s, p) => s + p.pct, 0) !== 100 ? "text-red-400" : "text-green-600"}>{parcelas.reduce((s, p) => s + p.pct, 0) !== 100 ? "⚠ Deve somar 100%" : "✓ OK"}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={() => createProject.mutate({ clientId: lead.clientId, name: lead.title, contractValue: total, parcelas: parcelas.filter(p => p.pct > 0).map((p, i) => ({ description: p.description, expectedValue: Math.round((p.pct / 100) * total * 100) / 100, sortOrder: i })) })} disabled={createProject.isPending || total <= 0 || saved} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60">
              {saved ? "✓ Criado!" : createProject.isPending ? "Criando..." : "Criar Projeto + Parcelas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────
export default function PipelinePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<LeadData | null>(null);
  const [convertLead, setConvertLead] = useState<LeadData | null>(null);
  const [reativarLeadId, setReativarLeadId] = useState<string | null>(null);
  const [deleteMenuLeadId, setDeleteMenuLeadId] = useState<string | null>(null);

  const { data: pipeline, refetch } = trpc.leads.pipeline.useQuery();
  const updateStatus = trpc.leads.updateStatus.useMutation({ onSuccess: () => refetch() });
  const deleteLead = trpc.leads.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteMenuLeadId(null); },
    onError: (e) => alert(e.message),
  });
  const deleteProposal = trpc.proposals.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteMenuLeadId(null); },
    onError: (e) => alert(e.message),
  });
  const { data: projectsData, refetch: refetchProjects } = trpc.projects.list.useQuery();
  const projectsByName = new Map(projectsData?.map(p => [p.name, p]) ?? []);

  const allLeads = Object.values(pipeline ?? {}).flat();
  const totalValue = allLeads.filter(l => !["proposta_declinada","perdido"].includes(l.status)).reduce((s, l) => s + Number(l.estimatedValue ?? 0), 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 uppercase tracking-wide">Processo Comercial</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {allLeads.filter(l => !["proposta_declinada","perdido"].includes(l.status)).length} oportunidades · {formatCurrency(totalValue)} em aberto
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg transition whitespace-nowrap">
          + Novo Lead
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
        {COLUMN_ORDER.map((status) => {
          const leads = pipeline?.[status] ?? [];
          const total = leads.reduce((s, l) => s + Number(l.estimatedValue ?? 0), 0);
          const colors = STATUS_COLORS[status];

          return (
            <div key={status} className="flex-shrink-0 w-64">
              <div className={`flex items-center justify-between mb-2 pb-2 border-b-2 ${colors.col}`}>
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.badge}`}>{STATUS_LABELS[status]}</span>
                <span className="text-xs text-gray-400 font-semibold">{leads.length}</span>
              </div>
              {total > 0 && <p className="text-xs text-gray-400 mb-2">{formatCurrency(total)}</p>}

              <div className="space-y-2 min-h-[80px]">
                {leads.map((lead) => {
                  const projeto = projectsByName.get(lead.title);
                  const parcelasP = projeto?.paymentSchedule ?? [];
                  const totalP = parcelasP.reduce((s, p) => s + Number(p.expectedValue), 0);
                  const totalR = parcelasP.reduce((s, p) => s + Number(p.receivedValue), 0);
                  const pct = totalP > 0 ? Math.round((totalR / totalP) * 100) : 0;
                  const badgeColor = lead.serviceType ? (SERVICE_BADGE[lead.serviceType] ?? "bg-gray-100 text-gray-500") : null;

                  return (
                    <div key={lead.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-[#1A1A1A] transition group">
                      {/* Título + botão editar */}
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{lead.title}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                          <button onClick={() => setEditLead(lead as LeadData)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#1A1A1A] transition text-xs" title="Editar">✏</button>
                          {role === "admin" && (
                            <button onClick={() => setDeleteMenuLeadId(lead.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition text-xs" title="Excluir">🗑</button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{lead.client.company ?? lead.client.name}</p>

                      {lead.serviceType && badgeColor && (
                        <span className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mb-2 ${badgeColor}`}>
                          {lead.serviceType.length > 18 ? lead.serviceType.slice(0, 16) + "…" : lead.serviceType}
                        </span>
                      )}

                      {lead.estimatedValue && (
                        <p className="text-sm font-extrabold text-[#F5A623]">{formatCurrency(Number(lead.estimatedValue))}</p>
                      )}

                      {/* Propostas vinculadas */}
                      {(lead as any).proposals?.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {(lead as any).proposals.map((p: ProposalData) => (
                            <ProposalBadge key={p.id} proposal={p} onUpdated={refetch} />
                          ))}
                        </div>
                      )}

                      {/* Info financeira em Fechado */}
                      {status === "fechado_ganho" && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          {projeto ? (
                            <>
                              {/* Código do projeto — editável */}
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <ProjectCodeBadge
                                  projectId={projeto.id}
                                  code={projeto.code}
                                  onUpdated={refetchProjects}
                                />
                              </div>
                              {totalP > 0 ? (
                                <>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-green-600 font-semibold">Recebido {formatCurrency(totalR)}</span>
                                    <span className="text-gray-400">A receber {formatCurrency(totalP - totalR)}</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </>
                              ) : (
                                <p className="text-xs text-gray-400 mb-1">Sem parcelas definidas</p>
                              )}
                              {role !== "funcionario" && (
                                <a href="/financeiro" className="text-[10px] text-[#1A1A1A] hover:underline font-medium">
                                  Gerenciar no Financeiro →
                                </a>
                              )}
                            </>
                          ) : (
                            <button onClick={() => setConvertLead(lead as LeadData)} className="w-full text-xs py-1.5 bg-green-50 text-green-700 font-semibold rounded border border-green-200 hover:bg-green-100 transition">
                              + Definir parcelas
                            </button>
                          )}
                        </div>
                      )}

                      {/* Botões de fase */}
                      <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-100">
                        {/* Fase normal: voltar/avançar/declinar */}
                        {status !== "proposta_declinada" && (
                          <div className="flex gap-1">
                            {PREV_STATUS[status] && (
                              <button onClick={() => updateStatus.mutate({ id: lead.id, status: PREV_STATUS[status]! })} className="flex-1 text-xs py-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 transition">← Voltar</button>
                            )}
                            {NEXT_STATUS[status] && (
                              <button onClick={() => updateStatus.mutate({ id: lead.id, status: NEXT_STATUS[status]! })} className="flex-1 text-xs py-1 rounded bg-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A]/20 font-semibold transition">Avançar →</button>
                            )}
                            {(status === "elaboracao_proposta" || status === "negociacao") && (
                              <button onClick={() => updateStatus.mutate({ id: lead.id, status: "proposta_declinada" })} className="text-xs py-1 px-2 rounded border border-purple-200 text-purple-400 hover:bg-purple-50 transition" title="Declinar proposta">✕</button>
                            )}
                          </div>
                        )}

                        {/* Coluna declinado: botão reativar */}
                        {status === "proposta_declinada" && (
                          reativarLeadId === lead.id ? (
                            <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Reativar para:</p>
                              {REACTIVATE_OPTIONS.map(opt => (
                                <button
                                  key={opt.status}
                                  onClick={() => { updateStatus.mutate({ id: lead.id, status: opt.status }); setReativarLeadId(null); }}
                                  className="w-full text-xs py-1.5 rounded bg-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A]/20 font-semibold transition text-left px-2"
                                >
                                  → {opt.label}
                                </button>
                              ))}
                              <button onClick={() => setReativarLeadId(null)} className="w-full text-xs py-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 transition">Cancelar</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReativarLeadId(lead.id)}
                              className="w-full text-xs py-1.5 rounded border border-[#1A1A1A]/30 text-[#1A1A1A] hover:bg-[#1A1A1A]/10 font-semibold transition"
                            >
                              ↩ Reativar Lead
                            </button>
                          )
                        )}
                      </div>

                      {/* Menu de exclusão — pergunta o que apagar (somente admin) */}
                      {role === "admin" && deleteMenuLeadId === lead.id && (
                        <div className="mt-2 pt-2 border-t border-red-100 space-y-1">
                          <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">O que deseja excluir?</p>
                          {(lead as any).proposals?.map((p: ProposalData) => (
                            <button
                              key={p.id}
                              onClick={() => { if (confirm(`Excluir a proposta ${p.code}? Esta ação não pode ser desfeita.`)) deleteProposal.mutate({ id: p.id }); }}
                              disabled={deleteProposal.isPending}
                              className="w-full text-xs py-1.5 rounded border border-orange-200 text-orange-600 hover:bg-orange-50 font-semibold transition text-left px-2 disabled:opacity-50"
                            >
                              🗑 Excluir proposta {p.code}
                            </button>
                          ))}
                          <button
                            onClick={() => { if (confirm(`Excluir TODO o lead "${lead.title}"? Isso remove propostas, itens e interações vinculadas. O cliente NÃO será excluído. Esta ação não pode ser desfeita.`)) deleteLead.mutate({ id: lead.id }); }}
                            disabled={deleteLead.isPending}
                            className="w-full text-xs py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition text-left px-2 disabled:opacity-50"
                          >
                            🗑 Excluir lead completo (mantém cliente)
                          </button>
                          <button onClick={() => setDeleteMenuLeadId(null)} className="w-full text-xs py-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 transition">Cancelar</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {leads.length === 0 && (
                  <div className="border-2 border-dashed border-gray-100 rounded-lg p-4 text-center text-gray-300 text-xs">Nenhum lead</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && <LeadModal mode="create" onClose={() => setShowModal(false)} onSuccess={() => refetch()} />}
      {editLead && <LeadModal mode="edit" lead={editLead} onClose={() => setEditLead(null)} onSuccess={() => { refetch(); setEditLead(null); }} />}
      {convertLead && <ConverterProjetoModal lead={convertLead} onClose={() => setConvertLead(null)} onSuccess={() => { refetch(); refetchProjects(); }} />}
    </div>
  );
}
