"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { RentalOperators, type RentalOperatorRow } from "./RentalOperators";

type RentalData = {
  id: string;
  machineId: string;
  proposalId: string | null;
  title: string;
  operador: string | null;
  location: string | null;
  startDate: string | Date;
  endDate: string | Date;
  notes: string | null;
  operators?: Array<{
    id: string;
    operatorId: string;
    role: "operador" | "ajudante";
    startDate: string | Date;
    endDate: string | Date | null;
    notes: string | null;
  }>;
};

export function RentalModal({
  rental,
  defaultMachineId,
  onClose,
  onSuccess,
}: {
  rental?: RentalData;
  defaultMachineId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!rental;
  const { data: machines } = trpc.frota.listMachines.useQuery({ includeInactive: true });
  const { data: proposals } = trpc.frota.getClosedProposalsForSelect.useQuery();

  const [form, setForm] = useState({
    machineId: rental?.machineId ?? defaultMachineId ?? "",
    proposalId: rental?.proposalId ?? "",
    title: rental?.title ?? "",
    operador: rental?.operador ?? "",
    location: rental?.location ?? "",
    startDate: rental ? new Date(rental.startDate).toISOString().slice(0, 10) : "",
    endDate: rental ? new Date(rental.endDate).toISOString().slice(0, 10) : "",
    notes: rental?.notes ?? "",
  });
  const [erro, setErro] = useState("");

  // Equipe alocada (operadores + ajudantes), cada um com período próprio
  const [equipe, setEquipe] = useState<RentalOperatorRow[]>(() =>
    (rental?.operators ?? []).map((o, i) => ({
      key: `${o.id}-${i}`,
      operatorId: o.operatorId,
      role: o.role,
      startDate: new Date(o.startDate).toISOString().slice(0, 10),
      endDate: o.endDate ? new Date(o.endDate).toISOString().slice(0, 10) : "",
      notes: o.notes ?? "",
    }))
  );

  const { data: operadores } = trpc.operadores.list.useQuery({ includeInactive: false });

  // Checagem de disponibilidade em tempo real, enquanto as datas são preenchidas
  const podeChecar = !!form.machineId && !!form.startDate && !!form.endDate;
  const { data: disponibilidade } = trpc.frota.checkAvailability.useQuery(
    {
      machineId: form.machineId,
      startDate: podeChecar ? new Date(form.startDate + "T08:00:00").toISOString() : new Date().toISOString(),
      endDate: podeChecar ? new Date(form.endDate + "T18:00:00").toISOString() : null,
      ignoreRentalId: rental?.id,
    },
    { enabled: podeChecar, staleTime: 5_000 }
  );

  const conflitos = disponibilidade?.conflitos ?? [];

  const createMut = trpc.frota.createRental.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const updateMut = trpc.frota.updateRental.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const deleteMut = trpc.frota.deleteRental.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]";

  function handleProposalChange(proposalId: string) {
    const prop = proposals?.find((p) => p.id === proposalId);
    setForm((f) => ({
      ...f,
      proposalId,
      title: prop ? `${prop.code ?? ""} ${prop.client?.company || prop.client?.name || prop.title || ""}`.trim() : f.title,
    }));
  }

  function handleSave() {
    if (!form.machineId) { setErro("Selecione a máquina."); return; }
    if (!form.title.trim()) { setErro("Informe um título/identificação para a locação."); return; }
    if (!form.startDate || !form.endDate) { setErro("Informe o período da locação."); return; }
    if (form.endDate < form.startDate) { setErro("A data final não pode ser anterior à inicial."); return; }

    const equipeInvalida = equipe.find(
      (r) => r.operatorId && r.endDate && r.endDate < r.startDate
    );
    if (equipeInvalida) {
      setErro("Há uma pessoa na equipe com data final anterior à inicial.");
      return;
    }
    setErro("");

    const proposal = proposals?.find((p) => p.id === form.proposalId);
    const data = {
      machineId: form.machineId,
      proposalId: form.proposalId || undefined,
      leadId: proposal?.leadId || undefined,
      clientId: proposal?.clientId || undefined,
      title: form.title.trim(),
      operador: form.operador.trim() || undefined,
      location: form.location.trim() || undefined,
      startDate: new Date(form.startDate + "T08:00:00").toISOString(),
      endDate: new Date(form.endDate + "T18:00:00").toISOString(),
      notes: form.notes || undefined,
      // Linhas sem pessoa selecionada são descartadas
      operators: equipe
        .filter((r) => r.operatorId && r.startDate)
        .map((r) => ({
          operatorId: r.operatorId,
          role: r.role,
          startDate: new Date(r.startDate + "T08:00:00").toISOString(),
          endDate: r.endDate ? new Date(r.endDate + "T18:00:00").toISOString() : null,
          notes: r.notes || null,
        })),
    };
    if (isEdit && rental) {
      updateMut.mutate({ id: rental.id, data });
    } else {
      createMut.mutate(data);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">{isEdit ? "Editar Locação" : "Nova Locação"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Máquina *</label>
            <select value={form.machineId} onChange={(e) => setForm((f) => ({ ...f, machineId: e.target.value }))} className={inputCls}>
              <option value="">Selecione...</option>
              {machines?.map((m: any) => <option key={m.id} value={m.id}>{m.name}{m.plateOrCode ? ` (${m.plateOrCode})` : ""}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vincular a Proposta Fechada</label>
            <select value={form.proposalId} onChange={(e) => handleProposalChange(e.target.value)} className={inputCls}>
              <option value="">Nenhuma (locação independente)</option>
              {proposals?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ?? p.title} — {p.client?.company || p.client?.name || "Cliente"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Título / Identificação *</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Ex: Locação obra Av. Paulista" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Localização</label>
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className={inputCls} placeholder="Ex: Obra Av. Paulista" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Início *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Término *</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} />
            </div>
          </div>

          {/* AVISO DE CONFLITO — chamativo, mas não bloqueia: a decisão é sua */}
          {conflitos.length > 0 && (
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 overflow-hidden">
              <div className="bg-amber-400 px-3 py-1.5">
                <p className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                  ⚠️ Máquina ocupada nesse período
                </p>
              </div>
              <div className="px-3 py-2.5 space-y-2">
                {conflitos.map((c: any) => (
                  <div key={`${c.kind}-${c.id}`} className="flex items-start gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                        c.kind === "manutencao"
                          ? "bg-amber-200 text-amber-900"
                          : "bg-blue-200 text-blue-900"
                      }`}
                    >
                      {c.kind === "manutencao" ? "Manutenção" : "Locação"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900 truncate">{c.label}</p>
                      {c.detail && <p className="text-xs text-amber-700 truncate">{c.detail}</p>}
                      <p className="text-[11px] text-amber-600">
                        {new Date(c.startDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })} →{" "}
                        {c.endDate
                          ? new Date(c.endDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                          : "sem previsão de término"}
                      </p>
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-amber-700 pt-1 border-t border-amber-200">
                  Você pode salvar mesmo assim — o conflito fica marcado na agenda de locações.
                </p>
              </div>
            </div>
          )}

          {podeChecar && conflitos.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <p className="text-xs font-semibold text-green-700">Máquina livre nesse período.</p>
            </div>
          )}

          {/* Equipe em campo: operadores e ajudantes, cada um com seu período */}
          <RentalOperators
            rows={equipe}
            operadores={operadores}
            rentalStart={form.startDate}
            rentalEnd={form.endDate}
            onChange={setEquipe}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} rows={2} />
          </div>

          {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erro}</div>}
        </div>

        <div className="flex gap-2 mt-5">
          {isEdit && rental && (
            <button
              onClick={() => { if (confirm("Remover esta locação?")) deleteMut.mutate({ id: rental.id }); }}
              disabled={isPending}
              className="py-2.5 px-3 border border-red-200 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-60"
              title="Excluir"
            >🗑</button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={isPending} className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-60">
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}
