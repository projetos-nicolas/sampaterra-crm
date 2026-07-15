"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { getPublicUrl, STORAGE_BUCKETS } from "@/lib/supabase";
import { MachineModal, STATUS_LABEL } from "@/components/frota/MachineModal";
import { MachineDetail } from "@/components/frota/MachineDetail";
import { LocacaoCalendar } from "@/components/frota/LocacaoCalendar";

const STATUS_COLOR: Record<string, string> = {
  disponivel: "bg-green-100 text-green-700",
  em_locacao: "bg-blue-100 text-blue-700",
  em_manutencao: "bg-amber-100 text-amber-700",
  inativa: "bg-gray-100 text-gray-500",
};

function ManutencaoTab() {
  const { data: machines, refetch } = trpc.frota.listMachines.useQuery({ includeInactive: true });
  const [newMachine, setNewMachine] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const updateMachine = trpc.frota.updateMachine.useMutation({ onSuccess: () => refetch() });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm">{machines?.length ?? 0} máquina(s) cadastrada(s)</p>
        <button
          onClick={() => setNewMachine(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F5A623] text-white text-sm font-semibold rounded-lg hover:bg-[#F7BB52] transition whitespace-nowrap"
        >
          + Nova Máquina
        </button>
      </div>

      {!machines || machines.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
          Nenhuma máquina cadastrada ainda. Clique em "Nova Máquina" para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((m: any) => (
            <div
              key={m.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition"
            >
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => setDetailId(m.id)}>
                <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                  {m.photoPath ? (
                    <img src={getPublicUrl(STORAGE_BUCKETS.FROTA, m.photoPath)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="w-7 h-7">
                      <rect x="1" y="7" width="13" height="9" rx="1" /><path d="M14 10h4l3 3v3h-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{[m.category, m.plateOrCode].filter(Boolean).join(" · ") || "—"}</p>
                  <span className={`inline-block mt-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLOR[m.status]}`}>
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                </div>
              </div>

              {/* Toggle de disponibilidade */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500">
                  {m.maintenances?.[0] ? (
                    <span className="text-gray-400">
                      Manutenção: {new Date(m.maintenances[0].date).toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <span className="text-gray-400">Sem manutenção registrada</span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextStatus = m.status === "disponivel" ? "inativa" : "disponivel";
                    updateMachine.mutate({ id: m.id, data: { status: nextStatus } });
                  }}
                  disabled={updateMachine.isPending}
                  title={m.status === "disponivel" ? "Marcar como indisponível" : "Marcar como disponível"}
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition disabled:opacity-50 ${
                    m.status === "disponivel"
                      ? "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
                      : "border-gray-300 text-gray-500 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${m.status === "disponivel" ? "bg-green-500" : "bg-gray-400"}`} />
                  {m.status === "disponivel" ? "Disponível" : "Indisponível"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {newMachine && (
        <MachineModal onClose={() => setNewMachine(false)} onSuccess={() => refetch()} />
      )}
      {detailId && (
        <MachineDetail machineId={detailId} onClose={() => { setDetailId(null); refetch(); }} />
      )}
    </div>
  );
}

export default function FrotaPage() {
  const [tab, setTab] = useState<"manutencao" | "locacao">("manutencao");

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 uppercase tracking-wide">Frota</h1>
          <p className="text-gray-400 text-sm mt-0.5">Máquinas, manutenções e locações</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { id: "manutencao", label: "Manutenção" },
          { id: "locacao", label: "Locação" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              tab === t.id
                ? "border-[#1A1A1A] text-[#1A1A1A]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "manutencao" ? <ManutencaoTab /> : <LocacaoCalendar />}
    </div>
  );
}
