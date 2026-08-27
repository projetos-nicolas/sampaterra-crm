"use client";

import { trpc } from "@/trpc/client";
import { formatCpfCnpj } from "@/lib/utils";

const fmtDate = (d: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";

export function OperatorDetail({
  operatorId,
  onClose,
  onEdit,
}: {
  operatorId: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data: op, isLoading } = trpc.operadores.get.useQuery({ id: operatorId });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 my-8">
        {isLoading || !op ? (
          <p className="text-sm text-gray-400 py-8 text-center">Carregando...</p>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900 text-lg">{op.name}</h2>
                  {!op.active && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{op.role || "Cargo não informado"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Editar
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { l: "CPF", v: op.cpf ? formatCpfCnpj(op.cpf) : "—" },
                { l: "RG", v: op.rg || "—" },
                { l: "Telefone", v: op.phone || "—" },
                { l: "Dias em campo", v: String(op.diasTotais) },
              ].map((i) => (
                <div key={i.l} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{i.l}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{i.v}</p>
                </div>
              ))}
            </div>

            {/* Consolidado por máquina */}
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Máquinas operadas
            </h3>
            {op.maquinasOperadas.length === 0 ? (
              <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-4 text-center border border-gray-100">
                Ainda não foi alocado em nenhuma locação.
              </p>
            ) : (
              <div className="space-y-1.5 mb-6">
                {op.maquinasOperadas.map((m) => (
                  <div
                    key={m.machineId}
                    className="flex items-center justify-between gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg"
                  >
                    <p className="text-sm font-semibold text-gray-800 truncate">{m.machineName}</p>
                    <p className="text-xs text-gray-400 whitespace-nowrap">
                      {m.locacoes} locação(ões) · <span className="font-semibold text-gray-600">{m.dias} dia(s)</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Histórico detalhado */}
            {op.assignments.length > 0 && (
              <>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Histórico de alocações
                </h3>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {op.assignments.map((a) => (
                    <div key={a.id} className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {a.rental.machine.name}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                            a.role === "ajudante"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {a.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{a.rental.title}</p>
                      <p className="text-[11px] text-gray-400">
                        {fmtDate(a.startDate)} → {a.endDate ? fmtDate(a.endDate) : "em aberto"}
                        {a.rental.location ? ` · 📍 ${a.rental.location}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {op.maintenances.length > 0 && (
              <>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-5">
                  Manutenções em que aparece
                </h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {op.maintenances.map((m) => (
                    <div key={m.id} className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm font-semibold text-gray-800 truncate">{m.machine.name}</p>
                      <p className="text-xs text-gray-500 truncate">{m.description}</p>
                      <p className="text-[11px] text-gray-400">{fmtDate(m.date)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
