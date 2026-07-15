"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";

type RentalData = {
  id: string;
  machineId: string;
  proposalId: string | null;
  title: string;
  operador: string | null;
  startDate: string | Date;
  endDate: string | Date;
  notes: string | null;
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
    startDate: rental ? new Date(rental.startDate).toISOString().slice(0, 10) : "",
    endDate: rental ? new Date(rental.endDate).toISOString().slice(0, 10) : "",
    notes: rental?.notes ?? "",
  });
  const [erro, setErro] = useState("");

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

    const proposal = proposals?.find((p) => p.id === form.proposalId);
    const data = {
      machineId: form.machineId,
      proposalId: form.proposalId || undefined,
      leadId: proposal?.leadId || undefined,
      clientId: proposal?.clientId || undefined,
      title: form.title.trim(),
      operador: form.operador.trim() || undefined,
      startDate: new Date(form.startDate + "T08:00:00").toISOString(),
      endDate: new Date(form.endDate + "T18:00:00").toISOString(),
      notes: form.notes || undefined,
    };
    if (isEdit && rental) {
      updateMut.mutate({ id: rental.id, data });
    } else {
      createMut.mutate(data);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 my-8">
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Operador</label>
            <input value={form.operador} onChange={(e) => setForm((f) => ({ ...f, operador: e.target.value }))} className={inputCls} placeholder="Nome do operador responsável" />
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
