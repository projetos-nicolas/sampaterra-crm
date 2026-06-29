"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/trpc/client";
import { RentalModal } from "./RentalModal";

const MACHINE_COLORS = [
  "bg-teal-500", "bg-orange-500", "bg-blue-500", "bg-purple-500",
  "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-indigo-500",
];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

export function LocacaoCalendar() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [modal, setModal] = useState<{ open: boolean; rental?: any }>({ open: false });

  const from = startOfMonth(cursor);
  const to = endOfMonth(cursor);

  const { data: rentals, refetch } = trpc.frota.listRentals.useQuery({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const { data: machines } = trpc.frota.listMachines.useQuery({ includeInactive: true });

  const daysInMonth = to.getDate();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const machineColor = (idx: number) => MACHINE_COLORS[idx % MACHINE_COLORS.length];

  const machinesWithRentals = useMemo(() => {
    if (!machines) return [];
    const usedIds = new Set((rentals ?? []).map((r: any) => r.machineId));
    return machines.filter((m: any) => usedIds.has(m.id) || m.status !== "inativa");
  }, [machines, rentals]);

  function isRented(machineId: string, day: number): any {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day, 12);
    return (rentals ?? []).find(
      (r: any) => r.machineId === machineId && new Date(r.startDate) <= date && new Date(r.endDate) >= date
    );
  }

  const today = new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500"
          >‹</button>
          <p className="font-bold text-gray-900 text-sm w-40 text-center">{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</p>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500"
          >›</button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 ml-1"
          >Hoje</button>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5A623] text-white text-xs font-semibold rounded-lg hover:bg-[#F7BB52] transition"
        >
          + Nova Locação
        </button>
      </div>

      {!machines || machines.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm bg-gray-50 rounded-lg">
          Cadastre máquinas na aba Manutenção para começar a programar locações.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="border-collapse text-xs min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white text-left px-3 py-2 font-semibold text-gray-500 border-b border-gray-200 min-w-[160px]">Máquina</th>
                {days.map((d) => {
                  const isToday = today.getFullYear() === cursor.getFullYear() && today.getMonth() === cursor.getMonth() && today.getDate() === d;
                  return (
                    <th key={d} className={`px-1 py-2 font-medium border-b border-gray-200 text-center w-6 ${isToday ? "text-[#F5A623]" : "text-gray-400"}`}>
                      {d}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {machinesWithRentals.map((m: any, idx: number) => (
                <tr key={m.id} className="border-b border-gray-100 last:border-0">
                  <td className="sticky left-0 bg-white px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">{m.name}</td>
                  {days.map((d) => {
                    const r = isRented(m.id, d);
                    return (
                      <td key={d} className="p-0.5 text-center">
                        {r ? (
                          <div
                            title={`${r.title}${r.client ? " · " + (r.client.company || r.client.name) : ""}`}
                            onClick={() => setModal({ open: true, rental: r })}
                            className={`h-5 rounded cursor-pointer ${machineColor(idx)} opacity-80 hover:opacity-100`}
                          />
                        ) : (
                          <div className="h-5 rounded bg-gray-50" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lista do mês */}
      <div className="mt-6">
        <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide mb-3">Locações do Mês</h3>
        {!rentals || rentals.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-sm bg-gray-50 rounded-lg">Nenhuma locação neste mês.</div>
        ) : (
          <div className="space-y-2">
            {rentals.map((r: any) => (
              <div key={r.id} onClick={() => setModal({ open: true, rental: r })} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3 hover:border-gray-300 cursor-pointer transition">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.machine.name} · {new Date(r.startDate).toLocaleDateString("pt-BR")} – {new Date(r.endDate).toLocaleDateString("pt-BR")}
                    {r.client ? ` · ${r.client.company || r.client.name}` : ""}
                    {r.proposal?.code ? ` · ${r.proposal.code}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <RentalModal
          rental={modal.rental}
          onClose={() => setModal({ open: false })}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
