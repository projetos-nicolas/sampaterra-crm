"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/trpc/client";
import { RentalModal } from "./RentalModal";

// Paleta de cores Obraria: teal + orange + complementares
const MACHINE_PALETTE = [
  { bg: "bg-[#0D4A47]", text: "text-white", dot: "bg-[#0D4A47]" },
  { bg: "bg-[#E8571A]", text: "text-white", dot: "bg-[#E8571A]" },
  { bg: "bg-teal-600",  text: "text-white", dot: "bg-teal-600"  },
  { bg: "bg-amber-500", text: "text-white", dot: "bg-amber-500" },
  { bg: "bg-blue-600",  text: "text-white", dot: "bg-blue-600"  },
  { bg: "bg-rose-500",  text: "text-white", dot: "bg-rose-500"  },
  { bg: "bg-emerald-600", text: "text-white", dot: "bg-emerald-600" },
  { bg: "bg-violet-600", text: "text-white", dot: "bg-violet-600" },
];

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DAY_LABELS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

export function LocacaoCalendar() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [modal, setModal] = useState<{ open: boolean; rental?: any }>({ open: false });

  const from = startOfMonth(cursor);
  const to   = endOfMonth(cursor);

  const { data: rentals, refetch } = trpc.frota.listRentals.useQuery({
    from: from.toISOString(),
    to:   to.toISOString(),
  });
  const { data: machines } = trpc.frota.listMachines.useQuery({ includeInactive: true });

  // Monta mapa machineId → índice de cor estável
  const machineColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    (machines ?? []).forEach((m: any, i: number) => { map[m.id] = i; });
    return map;
  }, [machines]);

  const palette = (machineId: string) =>
    MACHINE_PALETTE[machineColorMap[machineId] % MACHINE_PALETTE.length] ?? MACHINE_PALETTE[0];

  // Gera células do calendário (com espaços para alinhar ao dia da semana)
  const calendarCells = useMemo(() => {
    const firstDay = from.getDay(); // 0=dom
    const totalDays = to.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    return cells;
  }, [from, to]);

  // Para cada dia, quais locações estão ativas?
  function rentalsOnDay(day: number): any[] {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day, 12);
    return (rentals ?? []).filter(
      (r: any) => new Date(r.startDate) <= date && new Date(r.endDate) >= date
    );
  }

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === cursor.getFullYear() &&
    today.getMonth()    === cursor.getMonth() &&
    today.getDate()     === day;

  // Legenda: máquinas que têm locação no mês
  const machinesThisMonth = useMemo(() => {
    const ids = new Set((rentals ?? []).map((r: any) => r.machineId));
    return (machines ?? []).filter((m: any) => ids.has(m.id));
  }, [machines, rentals]);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500 font-bold"
          >‹</button>
          <p className="font-extrabold text-gray-900 text-base w-44 text-center uppercase tracking-wide">
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
          </p>
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500 font-bold"
          >›</button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="text-xs font-semibold text-gray-400 hover:text-[#0D4A47] ml-1 transition"
          >Hoje</button>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#E8571A] text-white text-sm font-bold rounded-lg hover:bg-[#c94715] transition"
        >
          + Nova Locação
        </button>
      </div>

      {/* ── Legenda de máquinas ── */}
      {machinesThisMonth.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {machinesThisMonth.map((m: any) => {
            const p = palette(m.id);
            return (
              <span key={m.id} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                {m.name}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Grade do calendário ── */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-[#0D4A47]">
          {DAY_LABELS.map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-bold text-white/80 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Células dos dias */}
        <div className="grid grid-cols-7">
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[80px] bg-gray-50 border-r border-b border-gray-100" />;
            }
            const dayRentals = rentalsOnDay(day);
            const isWeekend = (idx % 7 === 0 || idx % 7 === 6);
            const today_ = isToday(day);

            return (
              <div
                key={day}
                className={`min-h-[80px] border-r border-b border-gray-100 p-1.5 relative ${
                  isWeekend ? "bg-gray-50/60" : "bg-white"
                } ${today_ ? "ring-2 ring-inset ring-[#E8571A]" : ""}`}
              >
                {/* Número do dia */}
                <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                  today_
                    ? "bg-[#E8571A] text-white"
                    : isWeekend
                    ? "text-gray-400"
                    : "text-gray-700"
                }`}>
                  {day}
                </div>

                {/* Eventos de locação */}
                <div className="space-y-0.5">
                  {dayRentals.slice(0, 3).map((r: any) => {
                    const p = palette(r.machineId);
                    const isStart = new Date(r.startDate).getDate() === day &&
                      new Date(r.startDate).getMonth() === cursor.getMonth();
                    return (
                      <button
                        key={r.id}
                        onClick={() => setModal({ open: true, rental: r })}
                        title={`${r.machine?.name ?? ""} · ${r.title}`}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight truncate ${p.bg} ${p.text} hover:opacity-80 transition`}
                      >
                        {isStart ? (r.machine?.name ?? r.title) : ""}
                      </button>
                    );
                  })}
                  {dayRentals.length > 3 && (
                    <div className="text-[10px] text-gray-400 font-semibold pl-1">+{dayRentals.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Lista do mês ── */}
      <div className="mt-6">
        <h3 className="font-bold text-[#0D4A47] text-sm uppercase tracking-wider mb-3">
          Locações — {MONTH_NAMES[cursor.getMonth()]}
        </h3>
        {!rentals || rentals.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
            Nenhuma locação programada para este mês.
          </div>
        ) : (
          <div className="space-y-2">
            {rentals.map((r: any) => {
              const p = palette(r.machineId);
              return (
                <div
                  key={r.id}
                  onClick={() => setModal({ open: true, rental: r })}
                  className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 hover:border-[#0D4A47]/30 hover:shadow-sm cursor-pointer transition bg-white"
                >
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${p.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {r.machine?.name}
                      {r.operador ? ` · Op: ${r.operador}` : ""}
                      {r.client ? ` · ${r.client.company || r.client.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-700">
                      {new Date(r.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                    <p className="text-xs text-gray-400">
                      até {new Date(r.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
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
