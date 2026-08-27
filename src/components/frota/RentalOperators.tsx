"use client";

import { useMemo } from "react";

export type RentalOperatorRow = {
  key: string;
  operatorId: string;
  role: "operador" | "ajudante";
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd | ""
  notes: string;
};

/** Dias corridos entre duas datas ISO curtas, contando o dia inicial. */
export function diasEntre(start: string, end: string): number | null {
  if (!start || !end) return null;
  const a = Date.parse(start + "T00:00:00Z");
  const b = Date.parse(end + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return Math.round((b - a) / 86400000) + 1;
}

export function novaLinha(
  role: "operador" | "ajudante",
  startDate: string,
  endDate: string
): RentalOperatorRow {
  return {
    key: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    operatorId: "",
    role,
    startDate,
    endDate,
    notes: "",
  };
}

/**
 * Lista editável de pessoas alocadas na locação. Operadores e ajudantes usam
 * o mesmo cadastro (Operator), separados pelo campo `role` — assim ajudante
 * também acumula histórico de máquinas.
 */
export function RentalOperators({
  rows,
  operadores,
  rentalStart,
  rentalEnd,
  onChange,
}: {
  rows: RentalOperatorRow[];
  operadores: any[] | undefined;
  rentalStart: string;
  rentalEnd: string;
  onChange: (rows: RentalOperatorRow[]) => void;
}) {
  const inputCls =
    "w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]";

  const totaisPorPessoa = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (!r.operatorId) continue;
      const d = diasEntre(r.startDate, r.endDate);
      if (d == null) continue;
      map.set(r.operatorId, (map.get(r.operatorId) ?? 0) + d);
    }
    return map;
  }, [rows]);

  function update(key: string, patch: Partial<RentalOperatorRow>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function remove(key: string) {
    onChange(rows.filter((r) => r.key !== key));
  }

  function add(role: "operador" | "ajudante") {
    onChange([...rows, novaLinha(role, rentalStart, rentalEnd)]);
  }

  // Um mesmo operador não deve aparecer duas vezes com o mesmo papel
  const duplicados = new Set(
    rows
      .map((r) => `${r.operatorId}|${r.role}`)
      .filter((k, i, arr) => k.split("|")[0] && arr.indexOf(k) !== i)
  );

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/70">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Equipe em campo
        </label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => add("operador")}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
          >
            + Operador
          </button>
          <button
            type="button"
            onClick={() => add("ajudante")}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-purple-200 text-purple-600 bg-white hover:bg-purple-50"
          >
            + Ajudante
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 py-3 text-center">
          Nenhuma pessoa alocada. Use os botões acima para adicionar operadores e ajudantes.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const dias = diasEntre(r.startDate, r.endDate);
            const total = totaisPorPessoa.get(r.operatorId);
            const dup = duplicados.has(`${r.operatorId}|${r.role}`);
            return (
              <div
                key={r.key}
                className={`bg-white rounded-lg border p-2.5 ${
                  dup ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      r.role === "ajudante"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {r.role}
                  </span>
                  <select
                    value={r.operatorId}
                    onChange={(e) => update(r.key, { operatorId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Selecione a pessoa...</option>
                    {operadores?.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.name}{o.role ? ` — ${o.role}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(r.key)}
                    className="text-gray-300 hover:text-red-500 text-lg leading-none px-1 shrink-0"
                    title="Remover"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">De</label>
                    <input
                      type="date"
                      value={r.startDate}
                      onChange={(e) => update(r.key, { startDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Até</label>
                    <input
                      type="date"
                      value={r.endDate}
                      onChange={(e) => update(r.key, { endDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="pb-1.5 text-right min-w-[70px]">
                    <span className="text-sm font-bold text-gray-800">
                      {dias != null ? `${dias}d` : "—"}
                    </span>
                    {total != null && dias != null && total !== dias && (
                      <span className="block text-[10px] text-gray-400">total {total}d</span>
                    )}
                  </div>
                </div>

                {dup && (
                  <p className="text-[11px] text-amber-700 mt-1.5">
                    Essa pessoa já está na lista com o mesmo papel — os dias serão somados.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rows.some((r) => !r.operatorId) && (
        <p className="text-[11px] text-gray-400 mt-2">
          Linhas sem pessoa selecionada são ignoradas ao salvar.
        </p>
      )}
    </div>
  );
}
