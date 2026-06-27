"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UploadArquivos } from "@/components/client/UploadArquivos";

const STATUS_CONFIG = {
  aguardando_inicio: { label: "Aguardando Início", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  em_andamento:      { label: "Em Andamento",      color: "bg-blue-50 text-blue-700",  dot: "bg-blue-500" },
  pausado:           { label: "Pausado",            color: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  concluido:         { label: "Concluído",          color: "bg-green-50 text-green-700",   dot: "bg-green-500" },
  cancelado:         { label: "Cancelado",          color: "bg-red-50 text-red-600",        dot: "bg-red-400" },
} as const;

type ProjectStatus = keyof typeof STATUS_CONFIG;

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function calcProgresso(milestones: { completedAt: Date | string | null }[]) {
  if (!milestones.length) return 0;
  return Math.round((milestones.filter((m) => m.completedAt).length / milestones.length) * 100);
}

// ─── Modal Novo Projeto ───────────────────────────────────────────────────────

function ModalNovoProjeto({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: clientsData } = trpc.clients.list.useQuery({});
  const createMut = trpc.projects.create.useMutation({ onSuccess });

  const [form, setForm] = useState({
    clientId: "", name: "", serviceType: "", contractValue: "",
    startDate: "", expectedEndDate: "", city: "", state: "SP", notes: "",
  });
  const [error, setError] = useState("");

  const SERVICE_TYPES = [
    { value: "edificio_pre_moldado", label: "Edifício Pré-Moldado" },
    { value: "expansao_industrial", label: "Expansão Industrial" },
    { value: "estrutura_metalica", label: "Estrutura Metálica" },
    { value: "muro_gabiao", label: "Muro de Gabião" },
    { value: "cobertura_metalica", label: "Cobertura Metálica" },
    { value: "galpao", label: "Galpão" },
    { value: "outro", label: "Outro" },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.name || !form.contractValue) {
      setError("Preencha os campos obrigatórios.");
      return;
    }
    createMut.mutate({
      clientId: form.clientId,
      name: form.name,
      serviceType: form.serviceType || undefined,
      contractValue: parseFloat(form.contractValue),
      startDate: form.startDate || undefined,
      expectedEndDate: form.expectedEndDate || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Novo Projeto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cliente *</label>
            <select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30">
              <option value="">Selecione...</option>
              {clientsData?.items?.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome do Projeto *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Cobertura Metálica Galpão Norte"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo de Serviço</label>
              <select value={form.serviceType} onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30">
                <option value="">Selecione...</option>
                {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor Contratado *</label>
              <input type="number" value={form.contractValue} onChange={(e) => setForm((f) => ({ ...f, contractValue: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Início Previsto</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Entrega Prevista</label>
              <input type="date" value={form.expectedEndDate} onChange={(e) => setForm((f) => ({ ...f, expectedEndDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cidade</label>
              <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="São Paulo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">UF</label>
              <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="SP" maxLength={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={createMut.isPending}
              className="flex-1 px-4 py-2 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50">
              {createMut.isPending ? "Criando..." : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card de Projeto ──────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: any; onClick: () => void }) {
  const cfg = STATUS_CONFIG[project.status as ProjectStatus] ?? STATUS_CONFIG.aguardando_inicio;
  const progresso = calcProgresso(project.milestones ?? []);
  const pago = project.paymentSchedule?.reduce((s: number, p: any) => s + Number(p.receivedValue), 0) ?? 0;
  const total = Number(project.contractValue);

  return (
    <div onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-[#1A1A1A]/30 cursor-pointer transition group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#F5A623] mb-0.5">{project.code}</p>
          <h3 className="font-bold text-gray-900 text-sm leading-tight truncate group-hover:text-[#1A1A1A] transition">{project.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{project.client?.company || project.client?.name}</p>
        </div>
        <span className={`ml-2 flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
      {project.milestones?.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Marcos</span><span>{progresso}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1A1A1A] rounded-full transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{project.city ? `${project.city}${project.state ? `/${project.state}` : ""}` : "—"}</span>
        <div className="text-right">
          <span className="font-bold text-gray-900">{fmt(total)}</span>
          {pago > 0 && <span className="text-gray-400 ml-1">({Math.round((pago / total) * 100)}% rec.)</span>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">{project._count?.logs ?? 0} diário</span>
        <span className="text-gray-200">·</span>
        <span className="text-xs text-gray-400">{project._count?.checklists ?? 0} checklists</span>
        {project.expectedEndDate && (
          <>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400">
              Entrega: {new Date(project.expectedEndDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ProjetosPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isClient = (session?.user as any)?.role === "client";
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null);
  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<ProjectStatus | "todos">("todos");
  const [showModal, setShowModal] = useState(false);

  const filtered = projects?.filter((p) => {
    const matchBusca = !busca ||
      p.name.toLowerCase().includes(busca.toLowerCase()) ||
      p.code.toLowerCase().includes(busca.toLowerCase()) ||
      (p.client?.company ?? p.client?.name ?? "").toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
    return matchBusca && matchStatus;
  }) ?? [];

  const countByStatus = (s: ProjectStatus) => projects?.filter((p) => p.status === s).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 uppercase tracking-wide">Projetos</h1>
          <p className="text-gray-400 text-sm mt-0.5">Obras e serviços em andamento</p>
        </div>
        {!isClient && (
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg transition whitespace-nowrap">
            + Novo Projeto
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(["aguardando_inicio", "em_andamento", "pausado", "concluido"] as ProjectStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button key={s} onClick={() => setFiltroStatus(filtroStatus === s ? "todos" : s)}
              className={`text-left p-3 rounded-xl border transition ${filtroStatus === s ? "border-[#1A1A1A] bg-[#1A1A1A]/5" : "border-gray-200 bg-white hover:border-gray-300"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-semibold text-gray-500">{cfg.label}</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{countByStatus(s)}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, código ou cliente..."
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 bg-white" />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 font-medium">Nenhum projeto encontrado.</p>
          {!projects?.length && !isClient && (
            <button onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-[#F5A623] text-white text-sm font-semibold rounded-lg hover:bg-[#F7BB52] transition">
              + Criar primeiro projeto
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => (
            <div key={p.id}>
              {isClient && uploadingProjectId === p.id ? (
                <div className="mb-3">
                  <UploadArquivos
                    projectId={p.id}
                    onSuccess={() => setUploadingProjectId(null)}
                    onCancel={() => setUploadingProjectId(null)}
                  />
                </div>
              ) : null}
              <div className="relative">
                <ProjectCard project={p} onClick={() => router.push(`/projetos/${p.id}`)} />
                {isClient && p.status === "em_andamento" && uploadingProjectId !== p.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadingProjectId(p.id); }}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2C2C] transition shadow-sm"
                    title="Enviar arquivos para este projeto"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Enviar Arquivos
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalNovoProjeto onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); refetch(); }} />
      )}
    </div>
  );
}
