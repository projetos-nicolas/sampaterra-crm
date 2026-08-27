"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { maskCPF, maskRG, maskPhone } from "@/lib/utils";

type OperatorData = {
  id: string;
  name: string;
  rg: string | null;
  cpf: string | null;
  role: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
};

const CARGOS = ["Operador", "Ajudante", "Encarregado", "Motorista", "Mecânico"];

export function OperatorModal({
  operator,
  onClose,
  onSuccess,
}: {
  operator?: OperatorData;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!operator;
  const [form, setForm] = useState({
    name: operator?.name ?? "",
    rg: operator?.rg ?? "",
    cpf: operator?.cpf ?? "",
    role: operator?.role ?? "",
    phone: operator?.phone ?? "",
    notes: operator?.notes ?? "",
  });
  const [erro, setErro] = useState("");

  const createMut = trpc.operadores.create.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const updateMut = trpc.operadores.update.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const deleteMut = trpc.operadores.delete.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });

  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]";

  function handleSave() {
    if (!form.name.trim()) { setErro("O nome é obrigatório."); return; }
    setErro("");
    const data = {
      name: form.name.trim(),
      rg: form.rg.trim() || null,
      cpf: form.cpf.trim() || null,
      role: form.role.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (isEdit && operator) updateMut.mutate({ id: operator.id, data });
    else createMut.mutate(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">
            {isEdit ? "Editar Operador" : "Novo Operador"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Nome *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
              placeholder="Nome completo"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Cargo
            </label>
            <input
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className={inputCls}
              placeholder="Ex: Operador"
              list="cargos-operador"
            />
            <datalist id="cargos-operador">
              {CARGOS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">CPF</label>
              <input
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: maskCPF(e.target.value) }))}
                className={inputCls}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">RG</label>
              <input
                value={form.rg}
                onChange={(e) => setForm((f) => ({ ...f, rg: maskRG(e.target.value) }))}
                className={inputCls}
                placeholder="00.000.000-0"
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Telefone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
              className={inputCls}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={inputCls}
              rows={2}
            />
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Só o nome é obrigatório — CPF, RG e cargo podem ser preenchidos depois.
          </p>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 whitespace-pre-line">
              {erro}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          {isEdit && operator && (
            <button
              onClick={() => {
                if (confirm(`Excluir ${operator.name} definitivamente?\n\nSe ele já operou alguma máquina, a exclusão será recusada para não apagar o histórico — use "Inativar".`)) {
                  deleteMut.mutate({ id: operator.id });
                }
              }}
              disabled={isPending}
              className="py-2.5 px-3 border border-red-200 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-60"
              title="Excluir definitivamente"
            >🗑</button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-60"
          >
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
