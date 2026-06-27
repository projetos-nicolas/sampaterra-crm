"use client";

import { trpc } from "@/trpc/client";
import { useSession } from "next-auth/react";
import Link from "next/link";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

const STATUS_PROJETO: Record<string, { label: string; color: string; dot: string }> = {
  aguardando_inicio: { label: "Aguardando Início", color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400" },
  em_andamento:      { label: "Em Andamento",       color: "bg-blue-50 text-blue-700",     dot: "bg-blue-500" },
  pausado:           { label: "Pausado",             color: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  concluido:         { label: "Concluído",           color: "bg-green-50 text-green-700",   dot: "bg-green-500" },
  cancelado:         { label: "Cancelado",           color: "bg-red-50 text-red-600",       dot: "bg-red-400" },
};

const STATUS_PROPOSTA: Record<string, { label: string; color: string }> = {
  rascunho:   { label: "Rascunho",    color: "bg-gray-100 text-gray-500" },
  enviada:    { label: "Enviada",     color: "bg-blue-50 text-blue-700" },
  em_analise: { label: "Em Análise",  color: "bg-yellow-50 text-yellow-700" },
  aprovada:   { label: "Aprovada",    color: "bg-green-50 text-green-700" },
  recusada:   { label: "Recusada",    color: "bg-red-50 text-red-600" },
  expirada:   { label: "Expirada",    color: "bg-gray-100 text-gray-400" },
};

const STATUS_DOC: Record<string, { label: string; dot: string }> = {
  a_iniciar:          { label: "A Iniciar",        dot: "bg-gray-400" },
  previa:             { label: "Prévia",            dot: "bg-purple-400" },
  em_producao:        { label: "Em Produção",       dot: "bg-blue-500" },
  em_revisao:         { label: "Em Revisão",        dot: "bg-yellow-500" },
  em_conferencia:     { label: "Em Conferência",    dot: "bg-orange-400" },
  liberado_para_obra: { label: "Lib. p/ Obra",      dot: "bg-teal-500" },
  finalizado:         { label: "Finalizado",        dot: "bg-green-500" },
};

export default function PortalClientePage() {
  const { data: session } = useSession();
  const { data: myClient }   = trpc.users.myClient.useQuery();
  const { data: projects }   = trpc.projects.list.useQuery();
  const { data: proposals }  = trpc.proposals.list.useQuery({});
  const { data: docs }       = trpc.docs.list.useQuery({});

  const nomeCliente = myClient?.company || myClient?.name || session?.user?.name || "Cliente";
  const projAtivos = projects?.filter((p) => p.status === "em_andamento") ?? [];
  const propostasAbertas = proposals?.filter((p) => ["enviada", "em_analise"].includes(p.status)) ?? [];
  const docsRecentes = (docs ?? []).filter((d) => d.status !== "superado").slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Boas-vindas */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[#1A1A1A]/30 text-sm font-semibold uppercase tracking-wide text-white/60">Bem-vindo ao Portal</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">{nomeCliente}</h1>
          <p className="text-white/60 text-sm mt-1">
            {projAtivos.length} projeto{projAtivos.length !== 1 ? "s" : ""} em andamento
            {propostasAbertas.length > 0 && ` · ${propostasAbertas.length} proposta${propostasAbertas.length !== 1 ? "s" : ""} aguardando`}
          </p>
        </div>
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-8 h-8">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Projetos Ativos",  value: projAtivos.length,                                      color: "text-[#1A1A1A]" },
          { label: "Total de Projetos", value: projects?.length ?? 0,                                  color: "text-gray-700" },
          { label: "Propostas",        value: proposals?.length ?? 0,                                  color: "text-[#F5A623]" },
          { label: "Documentos",       value: (docs ?? []).filter((d) => d.status !== "superado").length, color: "text-gray-700" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{k.label}</p>
            <p className={`text-3xl font-extrabold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Projetos em andamento */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Projetos em Andamento</h2>
          <Link href="/projetos" className="text-xs text-[#1A1A1A] font-semibold hover:underline">Ver todos →</Link>
        </div>
        {!projAtivos.length ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum projeto em andamento.</p>
        ) : (
          <div className="space-y-3">
            {projAtivos.map((proj) => {
              const milestones = proj.milestones ?? [];
              const progresso = milestones.length > 0
                ? Math.round((milestones.filter((m: any) => m.completedAt).length / milestones.length) * 100)
                : null;
              const recebido = (proj.paymentSchedule ?? []).reduce((s: number, p: any) => s + Number(p.receivedValue ?? 0), 0);
              const contrato = Number(proj.contractValue ?? 0);
              return (
                <Link key={proj.id} href={`/projetos/${proj.id}`}
                  className="block border border-gray-100 rounded-xl p-4 hover:border-[#1A1A1A]/30 hover:bg-[#1A1A1A]/3 transition group">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 group-hover:text-[#1A1A1A] transition">{proj.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{proj.code}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-[#1A1A1A]">{fmt(contrato)}</p>
                      <p className="text-xs text-gray-400">contrato</p>
                    </div>
                  </div>
                  {/* Progresso financeiro */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Recebido: {fmt(recebido)}</span>
                        <span>{contrato > 0 ? Math.round((recebido / contrato) * 100) : 0}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A1A1A] rounded-full transition-all"
                          style={{ width: `${contrato > 0 ? Math.min(100, (recebido / contrato) * 100) : 0}%` }} />
                      </div>
                    </div>
                    {progresso !== null && (
                      <div className="text-center shrink-0">
                        <p className="text-lg font-extrabold text-gray-700">{progresso}%</p>
                        <p className="text-xs text-gray-400">marcos</p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Linha inferior: Propostas + Documentos recentes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Propostas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Propostas</h2>
            <Link href="/propostas" className="text-xs text-[#1A1A1A] font-semibold hover:underline">Ver todas →</Link>
          </div>
          {!proposals?.length ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma proposta.</p>
          ) : (
            <div className="space-y-2">
              {proposals.slice(0, 5).map((prop) => {
                const scfg = STATUS_PROPOSTA[prop.status] ?? { label: prop.status, color: "bg-gray-100 text-gray-500" };
                return (
                  <div key={prop.id} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{prop.title}</p>
                      <p className="text-xs text-gray-400">{prop.code}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scfg.color}`}>{scfg.label}</span>
                      <p className="text-xs font-bold text-gray-600 mt-0.5">{fmt(Number(prop.totalValue ?? 0))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Documentos recentes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Documentos Técnicos</h2>
            <Link href="/documentos" className="text-xs text-[#1A1A1A] font-semibold hover:underline">Ver todos →</Link>
          </div>
          {!docsRecentes.length ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum documento.</p>
          ) : (
            <div className="space-y-2">
              {docsRecentes.map((doc) => {
                const scfg = STATUS_DOC[doc.status] ?? { label: doc.status, dot: "bg-gray-300" };
                return (
                  <div key={doc.id} className="flex items-center gap-3 py-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${scfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400">{(doc as any).project?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{scfg.label}</span>
                      {(doc as any).linkExterno && (
                        <a href={(doc as any).linkExterno} target="_blank" rel="noopener noreferrer"
                          className="text-[#1A1A1A] hover:underline text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                          🔗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
