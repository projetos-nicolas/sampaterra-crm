"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, icon, accent = false, alert = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
  alert?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-3 sm:p-4 flex items-start gap-2 sm:gap-3 ${alert ? "border-red-200 bg-red-50/40" : "border-gray-200"}`}>
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${alert ? "bg-red-100" : accent ? "bg-[#F5A623]/10" : "bg-[#1A1A1A]/8"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
        <p className={`text-lg sm:text-2xl font-extrabold mt-0.5 ${alert ? "text-red-500" : accent ? "text-[#F5A623]" : "text-[#1A1A1A]"}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, currency = false }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {currency ? fmtFull(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Funil stages ─────────────────────────────────────────────────────────────

const FUNIL_STAGES = [
  { key: "contato_inicial",     label: "Contato Inicial" },
  { key: "visita_tecnica",      label: "Visita Técnica" },
  { key: "elaboracao_proposta", label: "Elaboração Proposta" },
  { key: "negociacao",          label: "Negociação" },
] as const;

const LEAD_STATUS_COLORS: Record<string, string> = {
  contato_inicial:     "#94a3b8",
  visita_tecnica:      "#3b82f6",
  elaboracao_proposta: "#f59e0b",
  negociacao:          "#F5A623",
  fechado_ganho:       "#22c55e",
  perdido:             "#ef4444",
};

// ─── Página Principal ─────────────────────────────────────────────────────────

// ─── Painel de Aprovação de Cadastros ────────────────────────────────────────

function PainelCadastros() {
  const { data: requests, refetch } = trpc.requests.list.useQuery({ status: "pending" });
  const approveMut = trpc.requests.approve.useMutation({ onSuccess: () => refetch() });
  const rejectMut  = trpc.requests.reject.useMutation({ onSuccess: () => refetch() });

  const [approving, setApproving] = useState<string | null>(null);
  const [tempPass, setTempPass] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  if (!requests?.length) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-amber-100/60 border-b border-amber-200">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-sm font-bold text-amber-800">
          {requests.length} solicitação{requests.length !== 1 ? "ões" : ""} de cadastro aguardando aprovação
        </span>
      </div>

      <div className="divide-y divide-amber-100">
        {requests.map((req) => (
          <div key={req.id} className="p-4">
            <div className="flex items-start gap-4">
              {/* Avatar inicial */}
              <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center shrink-0 text-amber-800 font-bold text-sm">
                {req.name.charAt(0).toUpperCase()}
              </div>

              {/* Dados */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900">{req.type === "PJ" ? (req.company ?? req.name) : req.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${req.type === "PJ" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                    {req.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                  <span>✉️ {req.email}</span>
                  {req.cpf_cnpj && <span>📋 {req.cpf_cnpj}</span>}
                  {req.phone && <span>📞 {req.phone}</span>}
                  <span className="text-gray-400">
                    {new Date(req.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Área de aprovação */}
                {approving === req.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="password"
                      value={tempPass}
                      onChange={(e) => setTempPass(e.target.value)}
                      placeholder="Senha inicial para o cliente"
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                      autoFocus
                    />
                    <button
                      onClick={() => { approveMut.mutate({ id: req.id, initialPassword: tempPass }); setApproving(null); setTempPass(""); }}
                      disabled={tempPass.length < 6 || approveMut.isPending}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-green-700 transition">
                      Confirmar
                    </button>
                    <button onClick={() => setApproving(null)} className="px-3 py-1.5 border border-gray-200 text-xs rounded-lg hover:bg-gray-50">
                      Cancelar
                    </button>
                  </div>
                ) : rejecting === req.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Motivo da rejeição (opcional)"
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-red-200"
                      autoFocus
                    />
                    <button
                      onClick={() => { rejectMut.mutate({ id: req.id, notes: rejectNote || undefined }); setRejecting(null); setRejectNote(""); }}
                      disabled={rejectMut.isPending}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-red-600 transition">
                      Rejeitar
                    </button>
                    <button onClick={() => setRejecting(null)} className="px-3 py-1.5 border border-gray-200 text-xs rounded-lg hover:bg-gray-50">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setApproving(req.id); setRejecting(null); }}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition flex items-center gap-1">
                      ✓ Aprovar
                    </button>
                    <button
                      onClick={() => { setRejecting(req.id); setApproving(null); }}
                      className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition">
                      ✕ Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Redireciona clientes para o portal deles
  useEffect(() => {
    if ((session?.user as any)?.role === "client") {
      router.replace("/portal");
    }
  }, [session, router]);

  const role = (session?.user as any)?.role as string;
  const isAdmin = ["admin", "coordinator"].includes(role);

  const { data: kpis }        = trpc.dashboard.kpis.useQuery();
  const { data: funil }       = trpc.dashboard.funnelSummary.useQuery();
  const { data: mensal }      = trpc.dashboard.monthlyRevenue.useQuery();
  const { data: projStatus }  = trpc.dashboard.projectsByStatus.useQuery();
  const { data: docsStatus }  = trpc.dashboard.docsByStatus.useQuery();
  const { data: activity }    = trpc.dashboard.recentActivity.useQuery();

  // Funil — dados para o gráfico
  const funilData = FUNIL_STAGES.map(({ key, label }) => ({
    label,
    Leads: funil?.byStage[key]?.count ?? 0,
    Valor: funil?.byStage[key]?.value ?? 0,
  }));

  // Projetos por status — total
  const totalProjetos = projStatus?.reduce((s, p) => s + p.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 uppercase tracking-wide">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Visão gerencial do negócio</p>
      </div>

      {/* ── Painel de cadastros pendentes (admin/coordinator only) ── */}
      {isAdmin && <PainelCadastros />}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KPICard
          label="Leads Ativos"
          value={String(kpis?.totalLeadsAtivos ?? "—")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <KPICard
          label="Ganhos este Mês"
          value={String(kpis?.leadsGanhosMes ?? "—")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" className="w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
        <KPICard
          label="Projetos Ativos"
          value={String(kpis?.projAtivos ?? "—")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
        />
        <KPICard
          label="Recebido este Mês"
          value={kpis ? fmt(kpis.recebidoMes) : "—"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" className="w-5 h-5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          accent
        />
        <KPICard
          label="A Receber"
          value={kpis ? fmt(kpis.totalPendente) : "—"}
          sub="total pendente"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <KPICard
          label="Parcelas Atrasadas"
          value={String(kpis?.parcelasAtrasadas ?? "—")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke={kpis && kpis.parcelasAtrasadas > 0 ? "#ef4444" : "#94a3b8"} strokeWidth="2" className="w-5 h-5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          alert={!!(kpis && kpis.parcelasAtrasadas > 0)}
        />
      </div>

      {/* ── Linha 2: Faturamento Mensal (large) + Projetos por Status (small) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Faturamento Mensal */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Faturamento Mensal</h2>
              <p className="text-xs text-gray-400 mt-0.5">Recebido vs. Previsto — últimos 12 meses</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mensal ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip currency />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="previsto" name="Previsto" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recebido" name="Recebido" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Projetos por Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Projetos por Status</h2>
            <p className="text-xs text-gray-400 mt-0.5">{totalProjetos} projeto{totalProjetos !== 1 ? "s" : ""} no total</p>
          </div>
          {projStatus && projStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={projStatus}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {projStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v, "Projetos"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {projStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-600">{s.label}</span>
                    </div>
                    <span className="font-bold text-gray-700">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">Sem dados</div>
          )}
        </div>
      </div>

      {/* ── Linha 3: Funil Comercial + Docs por Status ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Funil Comercial */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Funil Comercial</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Pipeline: {funil ? fmt(funil.totalPipeline) : "—"}
                {funil && funil.totalFechado > 0 && ` · Fechado: ${fmt(funil.totalFechado)}`}
              </p>
            </div>
            <Link href="/pipeline" className="text-xs text-[#1A1A1A] hover:underline font-semibold">Ver pipeline →</Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funilData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={130} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Leads" fill="#1A1A1A" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Documentos por Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Documentos Técnicos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Distribuição por status</p>
          </div>
          {docsStatus && docsStatus.length > 0 ? (
            <div className="space-y-2">
              {docsStatus
                .filter((d) => d.status !== "superado")
                .sort((a, b) => b.count - a.count)
                .map((d) => {
                  const total = docsStatus.filter((x) => x.status !== "superado").reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                  return (
                    <div key={d.status}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-gray-600">{d.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{pct}%</span>
                          <span className="font-bold text-gray-700 w-4 text-right">{d.count}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                      </div>
                    </div>
                  );
              })}
              {docsStatus.find((d) => d.status === "superado") && (
                <p className="text-xs text-gray-300 mt-2">
                  + {docsStatus.find((d) => d.status === "superado")?.count} superado(s)
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">Sem documentos</div>
          )}
        </div>
      </div>

      {/* ── Linha 4: Atividade Recente ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Leads recentes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Leads Recentes</h2>
            <Link href="/pipeline" className="text-xs text-[#1A1A1A] hover:underline font-semibold">Ver todos →</Link>
          </div>
          {!activity?.recentLeads.length ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum lead recente</p>
          ) : (
            <div className="space-y-3">
              {activity.recentLeads.map((lead) => {
                const cor = LEAD_STATUS_COLORS[lead.status] ?? "#94a3b8";
                const LABELS: Record<string, string> = {
                  contato_inicial: "Contato", visita_tecnica: "Visita",
                  elaboracao_proposta: "Proposta", negociacao: "Negociação",
                  fechado_ganho: "Ganho", perdido: "Perdido",
                };
                return (
                  <div key={lead.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cor}20` }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{lead.title}</p>
                      <p className="text-xs text-gray-400">{lead.client?.company || lead.client?.name}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${cor}20`, color: cor }}>
                      {LABELS[lead.status] ?? lead.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Projetos em andamento */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Projetos em Andamento</h2>
            <Link href="/projetos" className="text-xs text-[#1A1A1A] hover:underline font-semibold">Ver todos →</Link>
          </div>
          {!activity?.recentProjects.length ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum projeto ativo</p>
          ) : (
            <div className="space-y-3">
              {activity.recentProjects.map((proj) => (
                <Link key={proj.id} href={`/projetos/${proj.id}`} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 -mx-1 transition group">
                  <div className="w-8 h-8 bg-[#1A1A1A]/8 rounded-lg flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" className="w-4 h-4">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#1A1A1A] transition">{proj.name}</p>
                    <p className="text-xs text-gray-400">{(proj.client as any)?.company || proj.client?.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-[#1A1A1A]">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(proj.contractValue))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
