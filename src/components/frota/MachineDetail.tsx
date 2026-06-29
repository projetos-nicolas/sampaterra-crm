"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { getPublicUrl, STORAGE_BUCKETS } from "@/lib/supabase";
import { MachineModal, STATUS_LABEL } from "./MachineModal";
import { MaintenanceModal } from "./MaintenanceModal";

const STATUS_COLOR: Record<string, string> = {
  disponivel: "bg-green-100 text-green-700",
  em_locacao: "bg-blue-100 text-blue-700",
  em_manutencao: "bg-amber-100 text-amber-700",
  inativa: "bg-gray-100 text-gray-500",
};

export function MachineDetail({ machineId, onClose }: { machineId: string; onClose: () => void }) {
  const { data: machine, refetch } = trpc.frota.getMachine.useQuery({ id: machineId });
  const [editMachine, setEditMachine] = useState(false);
  const [maintModal, setMaintModal] = useState<{ open: boolean; maintenance?: any }>({ open: false });

  if (!machine) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start gap-4">
          <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
            {machine.photoPath ? (
              <img src={getPublicUrl(STORAGE_BUCKETS.FROTA, machine.photoPath)} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="w-8 h-8">
                <rect x="1" y="7" width="13" height="9" rx="1" /><path d="M14 10h4l3 3v3h-7z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-gray-900 text-lg">{machine.name}</h2>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLOR[machine.status]}`}>
                {STATUS_LABEL[machine.status] ?? machine.status}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              {[machine.category, machine.brand, machine.model, machine.year].filter(Boolean).join(" · ") || "Sem detalhes cadastrados"}
              {machine.plateOrCode ? ` · ${machine.plateOrCode}` : ""}
            </p>
            {machine.notes && <p className="text-gray-500 text-xs mt-1.5">{machine.notes}</p>}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={() => setEditMachine(true)} className="text-xs font-semibold text-[#1A1A1A] border border-[#1A1A1A]/30 rounded-lg px-3 py-1.5 hover:bg-[#1A1A1A]/5">Editar</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none self-end">×</button>
          </div>
        </div>

        {/* Histórico de manutenções */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Histórico de Manutenções</h3>
            <button
              onClick={() => setMaintModal({ open: true })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5A623] text-white text-xs font-semibold rounded-lg hover:bg-[#F7BB52] transition"
            >
              + Nova Manutenção
            </button>
          </div>

          {machine.maintenances.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm bg-gray-50 rounded-lg">
              Nenhuma manutenção registrada ainda.
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {machine.maintenances.map((m: any) => (
                <div key={m.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition cursor-pointer" onClick={() => setMaintModal({ open: true, maintenance: m })}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{m.performedBy}</p>
                    <p className="text-xs text-gray-400">{new Date(m.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{m.description}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    {m.cost ? <p className="text-xs font-semibold text-gray-500">R$ {Number(m.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p> : <span />}
                    {m.photos?.length > 0 && (
                      <div className="flex gap-1">
                        {m.photos.slice(0, 4).map((p: string) => (
                          <img key={p} src={getPublicUrl(STORAGE_BUCKETS.FROTA, p)} alt="" className="w-8 h-8 rounded object-cover border border-gray-200" />
                        ))}
                        {m.photos.length > 4 && <span className="text-xs text-gray-400 self-center">+{m.photos.length - 4}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editMachine && (
        <MachineModal
          machine={machine}
          onClose={() => setEditMachine(false)}
          onSuccess={() => { refetch(); }}
        />
      )}
      {maintModal.open && (
        <MaintenanceModal
          machineId={machine.id}
          maintenance={maintModal.maintenance}
          onClose={() => setMaintModal({ open: false })}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
