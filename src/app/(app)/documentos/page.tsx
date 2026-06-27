"use client";

import { useState, Fragment } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UploadMultiplo } from "@/components/docs/UploadMultiplo";

// ─── Constantes de config ─────────────────────────────────────────────────────

const DOC_STATUS_CONFIG = {
  a_iniciar:            { label: "A Iniciar",              color: "bg-gray-100 text-gray-600",       dot: "bg-gray-400",    order: 0 },
  previa:               { label: "Prévia",                 color: "bg-purple-50 text-purple-700",    dot: "bg-purple-400",  order: 1 },
  em_producao:          { label: "Em Produção",            color: "bg-blue-50 text-blue-700",        dot: "bg-blue-500",    order: 2 },
  em_revisao:           { label: "Em Revisão",             color: "bg-yellow-50 text-yellow-700",    dot: "bg-yellow-500",  order: 3 },
  em_conferencia:       { label: "Em Conferência",         color: "bg-orange-50 text-orange-700",    dot: "bg-orange-500",  order: 4 },
  liberado_para_obra:   { label: "Liberado p/ Obra",       color: "bg-teal-50 text-teal-700",        dot: "bg-teal-500",    order: 5 },
  finalizado:           { label: "Finalizado",             color: "bg-green-50 text-green-700",      dot: "bg-green-500",   order: 6 },
  superado:             { label: "Superado",               color: "bg-gray-100 text-gray-400",       dot: "bg-gray-300",    order: 7 },
} as const;

const DOC_PRIORITY_CONFIG = {
  baixa:           { label: "Baixa",            color: "bg-gray-100 text-gray-500" },
  media:           { label: "Média",            color: "bg-blue-50 text-blue-600" },
  alta:            { label: "Alta",             color: "bg-orange-50 text-orange-600" },
  urgente:         { label: "Urgente",          color: "bg-red-50 text-red-600" },
  prazo_a_definir: { label: "Prazo a Definir",  color: "bg-gray-100 text-gray-400" },
} as const;

const DOC_TYPE_CONFIG = {
  art:                { label: "ART" },
  rrt:                { label: "RRT" },
  memorial_descritivo:{ label: "Memorial Desc." },
  contrato:           { label: "Contrato" },
  planilha_calculo:   { label: "Planilha de Cálculo" },
  prancha_pdf:        { label: "Prancha PDF" },
  link_externo:       { label: "Link Externo" },
  outro:              { label: "Outro" },
} as const;

type DocStatus   = keyof typeof DOC_STATUS_CONFIG;
type DocPriority = keyof typeof DOC_PRIORITY_CONFIG;
type DocType     = keyof typeof DOC_TYPE_CONFIG;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Badge de Status (clicável) ───────────────────────────────────────────────

function StatusBadge({
  status,
  docId,
  onUpdated,
}: {
  status: DocStatus;
  docId: string;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const updateMut = trpc.docs.updateStatus.useMutation({
    onSuccess: () => { onUpdated(); setOpen(false); },
  });
  const cfg = DOC_STATUS_CONFIG[status];
  const STATUS_ORDER = (Object.entries(DOC_STATUS_CONFIG) as [DocStatus, typeof DOC_STATUS_CONFIG[DocStatus]][])
    .sort((a, b) => a[1].order - b[1].order)
    .filter(([k]) => k !== "superado")
    .map(([k]) => k);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-transparent hover:border-gray-300 transition ${cfg.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-60">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-48">
            {STATUS_ORDER.map((s) => {
              const c = DOC_STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => updateMut.mutate({ id: docId, status: s })}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left ${s === status ? "font-bold" : ""}`}
                >
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Modal Editar Documento ───────────────────────────────────────────────────

type DocRow = {
  id: string;
  projectId: string;
  name: string;
  type: string;
  description: string | null;
  linkExterno: string | null;
  status: string;
  priority: string;
  version: string | null;
  dueDate: Date | string | null;
  assignedTo: string | null;
  project?: { id: string; name: string };
};

function ModalEditDoc({
  doc,
  onClose,
  onSuccess,
}: {
  doc: DocRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const updateMut = trpc.docs.update.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const [form, setForm] = useState({
    name: doc.name,
    type: doc.type as DocType,
    description: doc.description ?? "",
    linkExterno: doc.linkExterno ?? "",
    status: doc.status as DocStatus,
    priority: doc.priority as DocPriority,
    version: doc.version ?? "",
    dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString().split("T")[0] : "",
    assignedTo: doc.assignedTo ?? "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMut.mutate({
      id: doc.id,
      name: form.name,
      type: form.type,
      description: form.description || null,
      linkExterno: form.linkExterno || null,
      status: form.status,
      priority: form.priority,
      version: form.version || null,
      dueDate: form.dueDate || null,
      assignedTo: form.assignedTo || null,
    });
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]";
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 uppercase tracking-wide">Editar Documento</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Projeto: <span className="font-semibold text-gray-600">{doc.project?.name ?? "—"}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className={labelCls}>Nome do Documento *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </div>

          {/* Tipo + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value as DocType)} className={inputCls}>
                {(Object.entries(DOC_TYPE_CONFIG) as [DocType, { label: string }][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value as DocStatus)} className={inputCls}>
                {(Object.entries(DOC_STATUS_CONFIG) as [DocStatus, typeof DOC_STATUS_CONFIG[DocStatus]][])
                  .sort((a, b) => a[1].order - b[1].order)
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Prioridade + Versão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prioridade</label>
              <select value={form.priority} onChange={(e) => set("priority", e.target.value as DocPriority)} className={inputCls}>
                {(Object.entries(DOC_PRIORITY_CONFIG) as [DocPriority, { label: string; color: string }][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Versão</label>
              <input value={form.version} onChange={(e) => set("version", e.target.value)} placeholder="v1.0 / Rev. A" className={inputCls} />
            </div>
          </div>

          {/* Responsável + Prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Responsável</label>
              <input value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} placeholder="Nome do engenheiro" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prazo</label>
              <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Link Externo */}
          <div>
            <label className={labelCls}>Link Externo (Google Drive / OneDrive)</label>
            <input
              value={form.linkExterno}
              onChange={(e) => set("linkExterno", e.target.value)}
              placeholder="https://drive.google.com/..."
              className={inputCls}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls}>Observações</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className={inputCls + " resize-none"}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMut.isPending}
              className="flex-1 bg-[#1A1A1A] hover:bg-[#0a3b38] disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-bold transition"
            >
              {updateMut.isPending ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Novo Documento ─────────────────────────────────────────────────────

function ModalNovoDoc({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: projects } = trpc.projects.list.useQuery();
  const createMut = trpc.docs.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const [modo, setModo] = useState<"manual" | "upload">("manual");
  const [uploadProjectId, setUploadProjectId] = useState("");

  const [form, setForm] = useState({
    projectId: "",
    name: "",
    type: "outro" as DocType,
    description: "",
    linkExterno: "",
    status: "a_iniciar" as DocStatus,
    priority: "media" as DocPriority,
    version: "",
    dueDate: "",
    assignedTo: "",
  });
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectId || !form.name) {
      setError("Projeto e nome são obrigatórios.");
      return;
    }
    createMut.mutate({
      projectId: form.projectId,
      name: form.name,
      type: form.type,
      description: form.description || undefined,
      linkExterno: form.linkExterno || undefined,
      status: form.status,
      priority: form.priority,
      version: form.version || undefined,
      dueDate: form.dueDate || undefined,
      assignedTo: form.assignedTo || undefined,
    });
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]";
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 uppercase tracking-wide">Novo Documento</h2>
            <p className="text-xs text-gray-400 mt-0.5">Vincule um arquivo ou link externo a um projeto</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toggle modo */}
        <div className="flex gap-1 px-6 pt-4">
          <button
            type="button"
            onClick={() => setModo("manual")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${modo === "manual" ? "bg-[#1A1A1A] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            Inserir Manualmente
          </button>
          <button
            type="button"
            onClick={() => setModo("upload")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${modo === "upload" ? "bg-[#1A1A1A] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            Upload de Arquivo(s)
          </button>
        </div>

        {/* Modo Upload */}
        {modo === "upload" && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Projeto *</label>
              <select
                value={uploadProjectId}
                onChange={(e) => setUploadProjectId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              >
                <option value="">Selecione o projeto...</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {uploadProjectId ? (
              <UploadMultiplo
                projectId={uploadProjectId}
                onSuccess={() => { onSuccess(); onClose(); }}
                onCancel={onClose}
              />
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <p className="text-sm text-gray-400">Selecione um projeto acima para habilitar o upload</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className={`p-6 space-y-4 ${modo === "upload" ? "hidden" : ""}`}>
          {/* Projeto */}
          <div>
            <label className={labelCls}>Projeto *</label>
            <select value={form.projectId} onChange={(e) => set("projectId", e.target.value)} className={inputCls}>
              <option value="">Selecione o projeto...</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Nome */}
          <div>
            <label className={labelCls}>Nome do Documento *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: ART - Estrutura Metálica Galpão A"
              className={inputCls}
            />
          </div>

          {/* Tipo + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value as DocType)} className={inputCls}>
                {(Object.entries(DOC_TYPE_CONFIG) as [DocType, { label: string }][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value as DocStatus)} className={inputCls}>
                {(Object.entries(DOC_STATUS_CONFIG) as [DocStatus, typeof DOC_STATUS_CONFIG[DocStatus]][])
                  .sort((a, b) => a[1].order - b[1].order)
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Prioridade + Versão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prioridade</label>
              <select value={form.priority} onChange={(e) => set("priority", e.target.value as DocPriority)} className={inputCls}>
                {(Object.entries(DOC_PRIORITY_CONFIG) as [DocPriority, { label: string; color: string }][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Versão</label>
              <input value={form.version} onChange={(e) => set("version", e.target.value)} placeholder="v1.0 / Rev. A" className={inputCls} />
            </div>
          </div>

          {/* Responsável + Prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Responsável</label>
              <input value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} placeholder="Nome do engenheiro" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prazo</label>
              <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Link Externo */}
          <div>
            <label className={labelCls}>Link Externo (Google Drive / OneDrive)</label>
            <input
              value={form.linkExterno}
              onChange={(e) => set("linkExterno", e.target.value)}
              placeholder="https://drive.google.com/..."
              className={inputCls}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls}>Observações</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Notas adicionais sobre o documento..."
              className={inputCls + " resize-none"}
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex-1 bg-[#F5A623] hover:bg-[#F7BB52] disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-bold transition"
            >
              {createMut.isPending ? "Salvando..." : "Criar Documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function DocumentosPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const isClient = (session?.user as any)?.role === "client";

  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [groupByClient, setGroupByClient] = useState(false);
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocRow | null>(null);

  const { data: docs, refetch } = trpc.docs.list.useQuery({
    search: search || undefined,
    projectId: filterProject || undefined,
    type: filterType as DocType | undefined || undefined,
    status: filterStatus as DocStatus | undefined || undefined,
    priority: filterPriority as DocPriority | undefined || undefined,
  });

  const { data: projects } = trpc.projects.list.useQuery();
  const deleteMut = trpc.docs.delete.useMutation({ onSuccess: () => refetch() });

  // Filtro de cliente (client-side — dados já vieram do join)
  const docList = (docs ?? []).filter((d) => {
    if (!filterClient) return true;
    const client = (d as any).project?.client;
    return client?.id === filterClient;
  });

  // Clientes únicos presentes nos resultados
  const clientesUnicos = Array.from(
    new Map(
      (docs ?? [])
        .map((d) => (d as any).project?.client)
        .filter(Boolean)
        .map((c: { id: string; name: string; company: string | null }) => [c.id, c])
    ).values()
  ).sort((a: any, b: any) => (a.company || a.name).localeCompare(b.company || b.name));

  // Agrupamento por cliente
  const gruposPorCliente = groupByClient
    ? clientesUnicos.map((cliente: any) => ({
        cliente,
        docs: docList.filter((d) => (d as any).project?.client?.id === cliente.id),
      })).filter((g) => g.docs.length > 0)
    : [];

  function toggleCollapse(clientId: string) {
    setCollapsedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  // KPIs
  const total = docList.length;
  const urgentes = docList.filter((d) => d.priority === "urgente").length;
  const finalizados = docList.filter((d) => d.status === "finalizado").length;
  const emProducao = docList.filter(
    (d) => ["em_producao", "em_revisao", "em_conferencia"].includes(d.status)
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 uppercase tracking-wide">
            Documentos Técnicos
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            ARTs, RRTs, memoriais, contratos e pranchas — todos os projetos
          </p>
        </div>
        {!isClient && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg transition whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo Documento
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total de Documentos",
            value: total,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" className="w-5 h-5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            ),
            bg: "bg-[#1A1A1A]/8",
          },
          {
            label: "Em Produção / Revisão",
            value: emProducao,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            ),
            bg: "bg-blue-50",
          },
          {
            label: "Urgentes",
            value: urgentes,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="w-5 h-5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ),
            bg: "bg-red-50",
          },
          {
            label: "Finalizados",
            value: finalizados,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" className="w-5 h-5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ),
            bg: "bg-green-50",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className={`${kpi.bg} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-400 leading-tight">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-48">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, projeto, responsável..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
            />
          </div>

          {/* Cliente */}
          <select
            value={filterClient}
            onChange={(e) => { setFilterClient(e.target.value); setFilterProject(""); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] min-w-44"
          >
            <option value="">Todos os clientes</option>
            {clientesUnicos.map((c: any) => (
              <option key={c.id} value={c.id}>{c.company || c.name}</option>
            ))}
          </select>

          {/* Projeto */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] min-w-44"
          >
            <option value="">Todos os projetos</option>
            {(projects ?? [])
              .filter((p) => !filterClient || (p as any).clientId === filterClient)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>

          {/* Tipo */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
          >
            <option value="">Todos os tipos</option>
            {(Object.entries(DOC_TYPE_CONFIG) as [DocType, { label: string }][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
          >
            <option value="">Todos os status</option>
            {(Object.entries(DOC_STATUS_CONFIG) as [DocStatus, typeof DOC_STATUS_CONFIG[DocStatus]][])
              .sort((a, b) => a[1].order - b[1].order)
              .filter(([k]) => k !== "superado")
              .map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
          </select>

          {/* Prioridade */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
          >
            <option value="">Todas as prioridades</option>
            {(Object.entries(DOC_PRIORITY_CONFIG) as [DocPriority, { label: string; color: string }][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Toggle agrupar por cliente */}
          <button
            onClick={() => setGroupByClient((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border transition ${
              groupByClient
                ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            title="Agrupar por cliente"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Por Cliente
          </button>

          {/* Limpar filtros */}
          {(search || filterClient || filterProject || filterType || filterStatus || filterPriority) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterClient("");
                setFilterProject("");
                setFilterType("");
                setFilterStatus("");
                setFilterPriority("");
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {docList.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-[#1A1A1A]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" className="w-6 h-6">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-gray-900 font-bold">Nenhum documento encontrado</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || filterClient || filterProject || filterType || filterStatus || filterPriority
                ? "Tente ajustar os filtros"
                : "Adicione o primeiro documento técnico"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Documento</th>
                  {!groupByClient && (
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Cliente</th>
                  )}
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Projeto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Prioridade</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Responsável</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Prazo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Versão</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {groupByClient ? (
                  /* ── View agrupada por cliente ── */
                  gruposPorCliente.map(({ cliente, docs: grupoDocs }) => {
                    const collapsed = collapsedClients.has(cliente.id);
                    return (
                      <Fragment key={cliente.id}>
                        {/* Header do cliente */}
                        <tr
                          key={`header-${cliente.id}`}
                          className="bg-[#1A1A1A]/5 border-b border-[#1A1A1A]/10 cursor-pointer hover:bg-[#1A1A1A]/8 transition"
                          onClick={() => toggleCollapse(cliente.id)}
                        >
                          <td colSpan={9} className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#1A1A1A"
                                strokeWidth="2.5"
                                className={`w-3.5 h-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                              >
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs font-bold flex items-center justify-center">
                                  {(cliente.company || cliente.name).charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-[#1A1A1A] text-sm">
                                  {cliente.company || cliente.name}
                                </span>
                                {cliente.company && (
                                  <span className="text-xs text-gray-400">({cliente.name})</span>
                                )}
                              </div>
                              <span className="ml-auto text-xs text-gray-400 font-medium">
                                {grupoDocs.length} doc{grupoDocs.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* Linhas do cliente */}
                        {!collapsed && grupoDocs.map((doc) => {
                          const prioConfig = DOC_PRIORITY_CONFIG[doc.priority as DocPriority] ?? DOC_PRIORITY_CONFIG.media;
                          const typeLabel = DOC_TYPE_CONFIG[doc.type as DocType]?.label ?? doc.type;
                          const isOverdue = doc.dueDate && new Date(doc.dueDate) < new Date() && doc.status !== "finalizado";
                          return (
                            <tr key={doc.id} className="hover:bg-gray-50/50 transition group">
                              <td className="px-4 py-3 pl-10">
                                <div className="flex items-center gap-2">
                                  {doc.linkExterno ? (
                                    <a href={doc.linkExterno} target="_blank" rel="noopener noreferrer"
                                      className="font-semibold text-sm text-[#1A1A1A] hover:underline flex items-center gap-1">
                                      {doc.name}
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-60 shrink-0">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                      </svg>
                                    </a>
                                  ) : (
                                    <span className="font-semibold text-sm text-gray-900">{doc.name}</span>
                                  )}
                                  {doc.storagePath && <span className="text-xs text-gray-400">{fmtSize(doc.fileSize)}</span>}
                                </div>
                                {doc.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{doc.description}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <Link href={`/projetos/${doc.projectId}`} className="text-sm text-[#1A1A1A] hover:underline font-medium">
                                  {(doc as any).project?.name ?? "—"}
                                </Link>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-medium">{typeLabel}</span>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={doc.status as DocStatus} docId={doc.id} onUpdated={refetch} />
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${prioConfig.color}`}>{prioConfig.label}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{doc.assignedTo ?? <span className="text-gray-300">—</span>}</td>
                              <td className="px-4 py-3">
                                <span className={`text-sm ${isOverdue ? "text-red-500 font-semibold" : "text-gray-600"}`}>{fmtDate(doc.dueDate)}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-400">{doc.version ?? "—"}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                  {isAdmin && (
                                    <button onClick={() => setEditingDoc(doc as DocRow)}
                                      className="p-1.5 text-gray-400 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/8 rounded-lg transition" title="Editar">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                    </button>
                                  )}
                                  {doc.linkExterno && (
                                    <a href={doc.linkExterno} target="_blank" rel="noopener noreferrer"
                                      className="p-1.5 text-gray-400 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/8 rounded-lg transition" title="Abrir link">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                      </svg>
                                    </a>
                                  )}
                                  <Link href={`/projetos/${doc.projectId}?aba=documentos`}
                                    className="p-1.5 text-gray-400 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/8 rounded-lg transition" title="Ver no projeto">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                    </svg>
                                  </Link>
                                  <button onClick={() => { if (confirm(`Excluir "${doc.name}"?`)) deleteMut.mutate({ id: doc.id }); }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })
                ) : (
                  /* ── View plana (padrão) ── */
                  docList.map((doc) => {
                    const prioConfig = DOC_PRIORITY_CONFIG[doc.priority as DocPriority] ?? DOC_PRIORITY_CONFIG.media;
                    const typeLabel = DOC_TYPE_CONFIG[doc.type as DocType]?.label ?? doc.type;
                    const isOverdue = doc.dueDate && new Date(doc.dueDate) < new Date() && doc.status !== "finalizado";
                    const clienteLabel = (doc as any).project?.client?.company || (doc as any).project?.client?.name;

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition group">
                        {/* Nome */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {doc.linkExterno ? (
                              <a href={doc.linkExterno} target="_blank" rel="noopener noreferrer"
                                className="font-semibold text-sm text-[#1A1A1A] hover:underline flex items-center gap-1">
                                {doc.name}
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-60 shrink-0">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              </a>
                            ) : (
                              <span className="font-semibold text-sm text-gray-900">{doc.name}</span>
                            )}
                            {doc.storagePath && <span className="text-xs text-gray-400">{fmtSize(doc.fileSize)}</span>}
                          </div>
                          {doc.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{doc.description}</p>}
                        </td>

                        {/* Cliente */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{clienteLabel ?? <span className="text-gray-300">—</span>}</span>
                        </td>

                        {/* Projeto */}
                        <td className="px-4 py-3">
                          <Link href={`/projetos/${doc.projectId}`} className="text-sm text-[#1A1A1A] hover:underline font-medium">
                            {(doc as any).project?.name ?? "—"}
                          </Link>
                        </td>

                        {/* Tipo */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-medium">{typeLabel}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.status as DocStatus} docId={doc.id} onUpdated={refetch} />
                        </td>

                        {/* Prioridade */}
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${prioConfig.color}`}>{prioConfig.label}</span>
                        </td>

                        {/* Responsável */}
                        <td className="px-4 py-3 text-sm text-gray-600">{doc.assignedTo ?? <span className="text-gray-300">—</span>}</td>

                        {/* Prazo */}
                        <td className="px-4 py-3">
                          <span className={`text-sm ${isOverdue ? "text-red-500 font-semibold" : "text-gray-600"}`}>{fmtDate(doc.dueDate)}</span>
                        </td>

                        {/* Versão */}
                        <td className="px-4 py-3 text-sm text-gray-400">{doc.version ?? "—"}</td>

                        {/* Ações */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            {isAdmin && (
                              <button onClick={() => setEditingDoc(doc as DocRow)}
                                className="p-1.5 text-gray-400 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/8 rounded-lg transition" title="Editar documento">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            )}
                            {doc.linkExterno && (
                              <a href={doc.linkExterno} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/8 rounded-lg transition" title="Abrir link">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              </a>
                            )}
                            <Link href={`/projetos/${doc.projectId}?aba=documentos`}
                              className="p-1.5 text-gray-400 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/8 rounded-lg transition" title="Ver no projeto">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                              </svg>
                            </Link>
                            <button onClick={() => { if (confirm(`Excluir "${doc.name}"?`)) deleteMut.mutate({ id: doc.id }); }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Rodapé da tabela */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/40">
              <p className="text-xs text-gray-400">
                {docList.length} documento{docList.length !== 1 ? "s" : ""} encontrado{docList.length !== 1 ? "s" : ""}
                {groupByClient && ` · ${gruposPorCliente.length} cliente${gruposPorCliente.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo */}
      {showModal && (
        <ModalNovoDoc
          onClose={() => setShowModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Modal Editar (admin only) */}
      {editingDoc && isAdmin && (
        <ModalEditDoc
          doc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSuccess={() => { refetch(); setEditingDoc(null); }}
        />
      )}
    </div>
  );
}
