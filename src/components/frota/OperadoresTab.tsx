"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { formatCpfCnpj } from "@/lib/utils";
import { OperatorModal } from "./OperatorModal";
import { OperatorDetail } from "./OperatorDetail";

export function OperadoresTab() {
  const [showInactive, setShowInactive] = useState(true);
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const utils = trpc.useUtils();
  const { data: operadores, refetch } = trpc.operadores.list.useQuery({
    includeInactive: showInactive,
  });

  // Toda alteração precisa refletir nas outras telas: os selects de operador
  // dentro dos modais de locação e manutenção leem desta mesma query.
  const invalidateTudo = () => {
    utils.operadores.list.invalidate();
    utils.operadores.get.invalidate();
    utils.frota.listRentals.invalidate();
    utils.frota.getMachine.invalidate();
    refetch();
  };

  const setActive = trpc.operadores.setActive.useMutation({
    onSuccess: invalidateTudo,
    onError: (e) => setErro(e.message),
  });

  const ativos = operadores?.filter((o: any) => o.active).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="text-gray-400 text-sm">
            {ativos} operador(es) ativo(s)
            {operadores && operadores.length > ativos ? ` · ${operadores.length - ativos} inativo(s)` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Mostrar inativos
          </label>
          <button
            onClick={() => setNovo(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F5A623] text-white text-sm font-semibold rounded-lg hover:bg-[#F7BB52] transition whitespace-nowrap"
          >
            + Novo Operador
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 whitespace-pre-line">
          {erro}
          <button onClick={() => setErro("")} className="ml-2 underline text-xs">fechar</button>
        </div>
      )}

      {!operadores || operadores.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
          Nenhum operador cadastrado. Clique em "Novo Operador" para começar — só o nome é obrigatório.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {operadores.map((o: any) => (
            <div
              key={o.id}
              className={`bg-white rounded-xl border p-4 transition ${
                o.active
                  ? "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  : "border-gray-200 bg-gray-50/60 opacity-75"
              }`}
            >
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => setDetalheId(o.id)}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                    o.active ? "bg-[#1A1A1A] text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {o.name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{o.name}</p>
                  <p className="text-xs text-gray-400 truncate">{o.role || "Cargo não informado"}</p>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {o.cpf ? formatCpfCnpj(o.cpf) : "CPF não informado"}
                  </p>
                </div>
              </div>

              {/* Últimas máquinas operadas */}
              {o.assignments?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {o.assignments.slice(0, 3).map((a: any) => (
                    <span
                      key={a.id}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 truncate max-w-full"
                      title={a.rental?.title}
                    >
                      {a.rental?.machine?.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-400">
                  {o.totalRegistros > 0 ? `${o.totalRegistros} registro(s)` : "Sem histórico"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditando(o); }}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setErro("");
                      setActive.mutate({ id: o.id, active: !o.active });
                    }}
                    disabled={setActive.isPending}
                    title={o.active ? "Marcar como inativo (histórico preservado)" : "Reativar operador"}
                    className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition disabled:opacity-50 ${
                      o.active
                        ? "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
                        : "border-gray-300 text-gray-500 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${o.active ? "bg-green-500" : "bg-gray-400"}`} />
                    {o.active ? "Ativo" : "Inativo"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {novo && <OperatorModal onClose={() => setNovo(false)} onSuccess={invalidateTudo} />}
      {editando && (
        <OperatorModal
          operator={editando}
          onClose={() => setEditando(null)}
          onSuccess={invalidateTudo}
        />
      )}
      {detalheId && (
        <OperatorDetail
          operatorId={detalheId}
          onClose={() => setDetalheId(null)}
          onEdit={() => {
            const op = operadores?.find((o: any) => o.id === detalheId);
            setDetalheId(null);
            if (op) setEditando(op);
          }}
        />
      )}
    </div>
  );
}
