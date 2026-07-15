"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];



const CATEGORY_LABEL: Record<string, string> = {
  salario: "Salários",
  contas: "Contas",
  manutencao: "Manutenção",
  bonificacao: "Bonificações",
  equipamento: "Equipamentos",
  outros: "Outros",
};
const CATEGORY_COLOR: Record<string, string> = {
  salario: "bg-blue-100 text-blue-700",
  contas: "bg-yellow-100 text-yellow-700",
  manutencao: "bg-orange-100 text-orange-700",
  bonificacao: "bg-purple-100 text-purple-700",
  equipamento: "bg-teal-100 text-teal-700",
  outros: "bg-gray-100 text-gray-600",
};
const CATEGORY_BAR_COLOR: Record<string, string> = {
  salario: "#3b82f6",
  contas: "#eab308",
  manutencao: "#f97316",
  bonificacao: "#a855f7",
  equipamento: "#14b8a6",
  outros: "#9ca3af",
};

// ── Modal Registrar Pagamento ────────────────────────────────
function PagamentoModal({ parcelaId, descricao, valorPendente, onClose, onSuccess }: {
  parcelaId: string; descricao: string; valorPendente: number;
  onClose: () => void; onSuccess: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [valor, setValor] = useState(String(valorPendente.toFixed(2)));
  const [dataPagamento, setDataPagamento] = useState(today);
  const registrar = trpc.financeiro.registrarPagamento.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-1">Registrar Pagamento</h2>
        <p className="text-gray-400 text-sm mb-4">{descricao}</p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Valor Recebido (R$)</label>
            <input type="number" min="0.01" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data do Pagamento</label>
            <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={() => registrar.mutate({ id: parcelaId, valor: parseFloat(valor), paidAt: dataPagamento ? new Date(dataPagamento) : undefined })} disabled={registrar.isPending || !valor} className="flex-1 py-2.5 bg-[#F5A623] text-white text-sm font-semibold rounded-lg hover:bg-[#F7BB52] disabled:opacity-60">
            {registrar.isPending ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Editar Parcela ─────────────────────────────────────
function EditarParcelaModal({ parcela, onClose, onSuccess }: {
  parcela: { id: string; description: string; expectedValue: number; receivedValue: number; dueDate: Date | null; paidAt: Date | null; notes: string | null };
  onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    description: parcela.description,
    expectedValue: String(parcela.expectedValue),
    receivedValue: String(parcela.receivedValue),
    dueDate: parcela.dueDate ? new Date(parcela.dueDate).toISOString().split("T")[0] : "",
    paidAt: parcela.paidAt ? new Date(parcela.paidAt).toISOString().split("T")[0] : "",
    notes: parcela.notes ?? "",
  });
  const update = trpc.financeiro.updateParcela.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const del = trpc.financeiro.deleteParcela.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4">Editar Parcela</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descrição</label>
            <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Valor Previsto (R$)</label>
              <input type="number" min="0" step="0.01" value={form.expectedValue} onChange={e => setForm(f => ({...f, expectedValue: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Já Recebido (R$)</label>
              <input type="number" min="0" step="0.01" value={form.receivedValue} onChange={e => setForm(f => ({...f, receivedValue: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vencimento</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data do Pagamento</label>
            <input type="date" value={form.paidAt} onChange={e => setForm(f => ({...f, paidAt: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
            <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Opcional..." />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => { if (confirm("Excluir esta parcela?")) del.mutate({ id: parcela.id }); }} className="py-2.5 px-3 border border-red-200 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50" title="Excluir">🗑</button>
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => update.mutate({ id: parcela.id, description: form.description, expectedValue: parseFloat(form.expectedValue), receivedValue: parseFloat(form.receivedValue) || 0, dueDate: form.dueDate ? new Date(form.dueDate) : null, paidAt: form.paidAt ? new Date(form.paidAt) : null })}
            disabled={update.isPending}
            className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-60"
          >
            {update.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Editar Projeto ─────────────────────────────────────
function EditarProjetoModal({ project, onClose, onSuccess }: {
  project: { id: string; code: string; name: string; contractValue: number };
  onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ code: project.code, name: project.name, contractValue: String(project.contractValue) });
  const update = trpc.projects.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4">Editar Projeto</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Código do Projeto</label>
            <input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-[#1A1A1A] bg-[#1A1A1A]/5 text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="OBR-2026-001" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome do Projeto</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Valor do Contrato (R$)</label>
            <input type="number" min="0" step="0.01" value={form.contractValue} onChange={e => setForm(f => ({...f, contractValue: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={() => update.mutate({ id: project.id, code: form.code, name: form.name, contractValue: parseFloat(form.contractValue) })} disabled={update.isPending} className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-60">
            {update.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Badge de Status Editável ─────────────────────────────────
const STATUS_OPTIONS = ["pendente", "pago", "atrasado"] as const;
type EditableStatus = typeof STATUS_OPTIONS[number];

function StatusDropdown({ id, status, statusColor, statusLabel, onUpdated }: {
  id: string;
  status: string;
  statusColor: Record<string, string>;
  statusLabel: Record<string, string>;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const updateStatus = trpc.financeiro.updateStatus.useMutation({
    onSuccess: () => { onUpdated(); setOpen(false); },
  });
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition flex items-center gap-1 ${statusColor[status] ?? "bg-gray-100 text-gray-500"}`}
      >
        {statusLabel[status] ?? status}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 opacity-60"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[120px]">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id, status: s })}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left ${s === status ? "font-bold" : ""}`}
              >
                <span className={`inline-block text-xs font-bold uppercase px-1.5 py-0.5 rounded-full ${statusColor[s]}`}>{statusLabel[s]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Modal Nova Parcela ───────────────────────────────────────
function NovaParcela({ projectId, onClose, onSuccess }: { projectId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ description: "", expectedValue: "", dueDate: "" });
  const criar = trpc.financeiro.createParcela.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4">Adicionar Parcela</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descrição *</label>
            <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Sinal, Medição 1, Entrega Final..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Valor (R$) *</label>
            <input type="number" min="0" step="0.01" value={form.expectedValue} onChange={e => setForm(f => ({...f, expectedValue: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vencimento</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={() => criar.mutate({ projectId, description: form.description, expectedValue: parseFloat(form.expectedValue), dueDate: form.dueDate ? new Date(form.dueDate) : undefined })} disabled={criar.isPending || !form.description || !form.expectedValue} className="flex-1 py-2.5 bg-[#F5A623] text-white text-sm font-semibold rounded-lg hover:bg-[#F7BB52] disabled:opacity-60">
            {criar.isPending ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tooltip customizado ──────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.name === "Recebido" || p.name === "Ganhos" ? "#16a34a" : p.name === "Gastos" ? "#ef4444" : "#F5A623" }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Modal Novo/Editar Gasto ──────────────────────────────────
function GastoModal({
  gasto,
  defaultMonth,
  defaultYear,
  onClose,
  onSuccess,
}: {
  gasto?: { id: string; description: string; category: string; value: number; referenceDate: Date; notes: string | null };
  defaultMonth: number;
  defaultYear: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!gasto;
  const defaultDate = gasto
    ? new Date(gasto.referenceDate).toISOString().split("T")[0]
    : `${defaultYear}-${String(defaultMonth).padStart(2, "0")}-01`;

  const [form, setForm] = useState({
    description: gasto?.description ?? "",
    category: gasto?.category ?? "outros",
    value: gasto ? String(gasto.value) : "",
    referenceDate: defaultDate,
    notes: gasto?.notes ?? "",
  });

  const criar = trpc.escritorio.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const editar = trpc.escritorio.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const excluir = trpc.escritorio.delete.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const handleSave = () => {
    const payload = {
      description: form.description,
      category: form.category as "salario"|"contas"|"manutencao"|"bonificacao"|"equipamento"|"outros",
      value: parseFloat(form.value),
      referenceDate: new Date(form.referenceDate + "T12:00:00"),
      notes: form.notes || undefined,
    };
    if (isEdit && gasto) {
      editar.mutate({ id: gasto.id, ...payload });
    } else {
      criar.mutate(payload);
    }
  };

  const isPending = criar.isPending || editar.isPending || excluir.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4">{isEdit ? "Editar Gasto" : "Novo Gasto"}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descrição *</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="Ex: Aluguel escritório, Salário João..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Categoria *</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({...f, category: e.target.value}))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            >
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Valor (R$) *</label>
              <input
                type="number" min="0.01" step="0.01"
                value={form.value}
                onChange={e => setForm(f => ({...f, value: e.target.value}))}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Competência *</label>
              <input
                type="date"
                value={form.referenceDate}
                onChange={e => setForm(f => ({...f, referenceDate: e.target.value}))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              placeholder="Opcional..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {isEdit && gasto && (
            <button
              onClick={() => { if (confirm("Excluir este gasto?")) excluir.mutate({ id: gasto.id }); }}
              disabled={isPending}
              className="py-2.5 px-3 border border-red-200 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-60"
              title="Excluir"
            >🗑</button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={isPending || !form.description || !form.value || !form.referenceDate}
            className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-60"
          >
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Aba Gestão de Escritório ─────────────────────────────────
function EscritorioTab({ year }: { year: number }) {
  const hoje = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [gastoModal, setGastoModal] = useState<{
    gasto?: { id: string; description: string; category: string; value: number; referenceDate: Date; notes: string | null };
  } | null>(null);

  const { data: summary, refetch: refetchSummary } = trpc.escritorio.summary.useQuery({ year });
  const { data: gastos, refetch: refetchGastos } = trpc.escritorio.list.useQuery({
    year,
    month: selectedMonth ?? undefined,
  });

  const refetch = () => { refetchSummary(); refetchGastos(); };

  const totalGanhos = summary?.totalGanhos ?? 0;
  const totalGastos = summary?.totalGastos ?? 0;
  const resultado = summary?.resultado ?? 0;
  const porCategoria = summary?.porCategoria ?? {};

  const chartData = summary?.months.map((m, i) => ({
    mes: MONTH_NAMES[i],
    Ganhos: m.ganhos,
    Gastos: m.gastos,
    Resultado: m.ganhos - m.gastos,
  })) ?? [];

  const margemPct = totalGanhos > 0 ? Math.round((resultado / totalGanhos) * 100) : 0;

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border-l-4 border-green-500 border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Ganhos Recebidos {year}</p>
          <p className="text-2xl font-extrabold text-green-600">{formatCurrency(totalGanhos)}</p>
          <p className="text-xs text-gray-400 mt-1">Valores efetivamente recebidos</p>
        </div>
        <div className="bg-white rounded-xl border-l-4 border-red-400 border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Gastos do Escritório {year}</p>
          <p className="text-2xl font-extrabold text-red-500">{formatCurrency(totalGastos)}</p>
          <p className="text-xs text-gray-400 mt-1">Total de despesas lançadas</p>
        </div>
        <div className={`bg-white rounded-xl border-l-4 ${resultado >= 0 ? "border-[#1A1A1A]" : "border-red-500"} border border-gray-200 p-4`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Resultado {year}</p>
          <p className={`text-2xl font-extrabold ${resultado >= 0 ? "text-[#1A1A1A]" : "text-red-500"}`}>{formatCurrency(resultado)}</p>
          <p className={`text-xs mt-1 font-semibold ${resultado >= 0 ? "text-green-500" : "text-red-400"}`}>
            {totalGanhos > 0 ? `Margem: ${margemPct}%` : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Gráfico Ganhos vs Gastos */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Ganhos vs Gastos por Mês — {year}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="30%" barGap={2}>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <Bar dataKey="Ganhos" fill="#16a34a" radius={[3,3,0,0]} fillOpacity={0.85} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[3,3,0,0]} fillOpacity={0.75} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gastos por categoria */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Por Categoria</h2>
          {totalGastos === 0 ? (
            <p className="text-xs text-gray-400 italic mt-6 text-center">Nenhum gasto lançado</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(CATEGORY_LABEL).map(([key, label]) => {
                const val = porCategoria[key] ?? 0;
                if (val === 0) return null;
                const pct = Math.round((val / totalGastos) * 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-semibold text-gray-600">{label}</span>
                      <span className="text-gray-500">{formatCurrency(val)} <span className="text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: CATEGORY_BAR_COLOR[key] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tabela de gastos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Lançamentos</h2>
            {/* Filtro mês */}
            <select
              value={selectedMonth ?? ""}
              onChange={e => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            >
              <option value="">Todos os meses</option>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <button
            onClick={() => setGastoModal({})}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2C2C] transition"
          >
            + Novo Gasto
          </button>
        </div>

        {!gastos || gastos.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400 text-sm">
            Nenhum gasto lançado{selectedMonth ? ` em ${MONTH_NAMES[selectedMonth - 1]}` : ""}.
            <div className="mt-3">
              <button onClick={() => setGastoModal({})} className="text-[#F5A623] font-semibold hover:underline text-xs">+ Adicionar primeiro gasto</button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#1A1A1A] text-white">
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">Descrição</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">Categoria</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">Competência</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Valor</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">Obs.</th>
                <th className="px-3 py-2.5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-2.5 font-medium text-gray-800">{g.description}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${CATEGORY_COLOR[g.category] ?? "bg-gray-100 text-gray-500"}`}>
                      {CATEGORY_LABEL[g.category] ?? g.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">
                    {MONTH_NAMES[new Date(g.referenceDate).getMonth()]}/{new Date(g.referenceDate).getFullYear()}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-red-500">{formatCurrency(Number(g.value))}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 max-w-[160px] truncate">{g.notes ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => setGastoModal({ gasto: { ...g, value: Number(g.value), referenceDate: new Date(g.referenceDate) } })}
                      className="text-gray-300 hover:text-[#1A1A1A] transition text-xs"
                      title="Editar"
                    >✏</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={3} className="px-5 py-2 text-xs font-bold text-gray-500 uppercase">
                  Total {selectedMonth ? MONTH_NAMES[selectedMonth - 1] : year}
                </td>
                <td className="px-3 py-2 text-right text-xs font-bold text-red-500">
                  {formatCurrency(gastos.reduce((s: number, g) => s + Number(g.value), 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          </div>
        )}
      </div>

      {gastoModal !== null && (
        <GastoModal
          gasto={gastoModal.gasto}
          defaultMonth={selectedMonth ?? hoje.getMonth() + 1}
          defaultYear={year}
          onClose={() => setGastoModal(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}

// ── Página Principal ─────────────────────────────────────────
export default function FinanceiroPage() {
  const currentYear = new Date().getFullYear();
  const hoje = new Date();
  const [year, setYear] = useState(currentYear);
  const [view, setView] = useState<"anual" | "parcelas" | "escritorio">("anual");
  const [pagamentoModal, setPagamentoModal] = useState<{ id: string; desc: string; pendente: number } | null>(null);
  const [novaParcelaProject, setNovaParcelaProject] = useState<string | null>(null);
  const [editarParcela, setEditarParcela] = useState<{ id: string; description: string; expectedValue: number; receivedValue: number; dueDate: Date | null; paidAt: Date | null; notes: string | null } | null>(null);
  const [editarProjeto, setEditarProjeto] = useState<{ id: string; code: string; name: string; contractValue: number } | null>(null);

  const { data: anoData, refetch: refetchAno } = trpc.financeiro.anoFechamento.useQuery({ year });
  const { data: projetos, refetch: refetchParcelas } = trpc.financeiro.todasParcelas.useQuery();
  const { data: anosDisponiveis } = trpc.financeiro.anosDisponiveis.useQuery();
  const { data: funil } = trpc.dashboard.funnelSummary.useQuery();

  const refetch = () => { refetchAno(); refetchParcelas(); };

  const totalPrevisto = anoData?.totalPrevisto ?? 0;
  const totalRecebido = anoData?.totalRecebido ?? 0;
  const totalContratado = anoData?.totalContratado ?? totalPrevisto;
  const aReceber = totalContratado - totalRecebido;

  const totalAtrasado = projetos?.reduce((s, p) =>
    s + p.paymentSchedule.filter(ps => ["pendente","parcial"].includes(ps.status) && ps.dueDate && new Date(ps.dueDate) < hoje)
      .reduce((ss, ps) => ss + Number(ps.expectedValue) - Number(ps.receivedValue), 0), 0) ?? 0;

  const chartData = anoData?.months.map((m, i) => ({
    mes: MONTH_NAMES[i],
    Previsto: m.previsto,
    Recebido: m.recebido,
    atual: i === hoje.getMonth() && year === currentYear,
  })) ?? [];

  const STATUS_COLOR: Record<string, string> = {
    pago: "bg-green-100 text-green-700",
    parcial: "bg-orange-100 text-[#F5A623]",
    pendente: "bg-gray-100 text-gray-500",
    atrasado: "bg-red-100 text-red-600",
  };
  const STATUS_LABEL: Record<string, string> = { pendente: "Pendente", pago: "Pago", parcial: "Parcial", atrasado: "Atrasado" };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 uppercase tracking-wide">Controle Financeiro</h1>
          <p className="text-gray-400 text-sm mt-0.5">Receitas, parcelas e despesas do escritório</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de ano */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
            <button onClick={() => setYear(y => y - 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 font-bold text-sm">‹</button>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer px-1">
              {(anosDisponiveis ?? [currentYear]).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setYear(y => y + 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 font-bold text-sm">›</button>
          </div>
          {/* Toggle view */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1 overflow-x-auto max-w-full">
            <button onClick={() => setView("anual")} className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-semibold transition whitespace-nowrap ${view === "anual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Fechamento Anual</button>
            <button onClick={() => setView("parcelas")} className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-semibold transition whitespace-nowrap ${view === "parcelas" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Por Parcelas</button>
            <button onClick={() => setView("escritorio")} className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-semibold transition whitespace-nowrap ${view === "escritorio" ? "bg-white text-[#1A1A1A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Gestão do Escritório</button>
          </div>
        </div>
      </div>

      {/* KPI Cards — só nas abas de receita */}
      {view !== "escritorio" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl border-l-4 border-[#F5A623] border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Contratado {year}</p>
            <p className="text-2xl font-extrabold text-[#F5A623]">{formatCurrency(totalContratado)}</p>
            <p className="text-xs text-gray-400 mt-1">{(projetos?.length ?? 0)} contrato{projetos?.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-white rounded-xl border-l-4 border-green-500 border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Recebido {year}</p>
            <p className="text-2xl font-extrabold text-green-600">{formatCurrency(totalRecebido)}</p>
            {totalContratado > 0 && <p className="text-xs text-green-500 mt-1">{Math.round((totalRecebido/totalContratado)*100)}% do total</p>}
          </div>
          <div className="bg-white rounded-xl border-l-4 border-blue-500 border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">A Receber ({year})</p>
            <p className="text-2xl font-extrabold text-blue-600">{formatCurrency(aReceber)}</p>
          </div>
          <div className={`bg-white rounded-xl border-l-4 ${totalAtrasado > 0 ? "border-red-500" : "border-gray-200"} border border-gray-200 p-4`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Em Atraso</p>
            <p className={`text-2xl font-extrabold ${totalAtrasado > 0 ? "text-red-500" : "text-gray-400"}`}>{formatCurrency(totalAtrasado)}</p>
            {totalAtrasado > 0 && <p className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded mt-1 inline-block">Ação necessária</p>}
          </div>
        </div>
      )}

      {/* ── FECHAMENTO ANUAL ── */}
      {view === "anual" && (
        <>
          {funil && funil.totalPipeline > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Pipeline Potencial — Em Negociação</h2>
                <a href="/pipeline" className="text-xs text-[#F5A623] font-semibold hover:underline">Ver processo comercial →</a>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "contato_inicial", label: "Contato Inicial", color: "text-gray-500" },
                  { key: "visita_tecnica", label: "Visita Técnica", color: "text-blue-600" },
                  { key: "elaboracao_proposta", label: "Elab. Proposta", color: "text-[#F5A623]" },
                  { key: "negociacao", label: "Negociação", color: "text-yellow-600" },
                ].map(({ key, label, color }) => {
                  const stage = funil.byStage[key as keyof typeof funil.byStage];
                  return (
                    <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className={`text-lg font-extrabold ${color}`}>{stage?.count ?? 0}</p>
                      {(stage?.value ?? 0) > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(stage.value)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>Total em aberto no funil: <strong className="text-gray-900">{formatCurrency(funil.totalPipeline)}</strong></span>
                <span>Contratos fechados (histórico): <strong className="text-[#1A1A1A]">{formatCurrency(funil.totalFechado)}</strong></span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Fluxo Mensal — {year}</h2>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500 inline-block"/>Recebido</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#F5A623]/40 inline-block"/>A Receber</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block"/>Atrasado</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#1A1A1A] text-white">
                    <th className="px-4 py-2.5 text-left font-semibold w-24 uppercase tracking-wider sticky left-0 bg-[#1A1A1A]">Mês</th>
                    {MONTH_NAMES.map((m, i) => {
                      const isCurrent = i === hoje.getMonth() && year === currentYear;
                      return <th key={m} className={`px-2 py-2.5 text-center font-semibold min-w-[68px] ${isCurrent ? "bg-[#2C2C2C]" : ""}`}>{m}{isCurrent ? " ◄" : ""}</th>;
                    })}
                    <th className="px-3 py-2.5 text-right font-semibold">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Previsto</td>
                    {anoData?.months.map((m, i) => (
                      <td key={i} className={`px-2 py-2.5 text-center font-medium ${i === hoje.getMonth() && year === currentYear ? "bg-[#FAFAF9]" : ""}`}>
                        {m.previsto > 0 ? <span className="text-gray-700">{formatCurrency(m.previsto).replace("R$","").trim()}</span> : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-bold text-gray-900">{formatCurrency(totalPrevisto)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-green-50/20">
                    <td className="px-4 py-2.5 font-bold text-green-600 uppercase tracking-wider">Recebido</td>
                    {anoData?.months.map((m, i) => (
                      <td key={i} className={`px-2 py-2.5 text-center ${i === hoje.getMonth() && year === currentYear ? "bg-green-50/30" : ""}`}>
                        {m.recebido > 0 ? <span className="text-green-600 font-bold">{formatCurrency(m.recebido).replace("R$","").trim()}</span> : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-bold text-green-600">{formatCurrency(totalRecebido)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-bold text-[#F5A623] uppercase tracking-wider">A Receber</td>
                    {anoData?.months.map((m, i) => {
                      const val = m.aReceber ?? 0;
                      const isOverdue = val > 0 && i < hoje.getMonth() && year <= currentYear;
                      return (
                        <td key={i} className={`px-2 py-2.5 text-center ${i === hoje.getMonth() && year === currentYear ? "bg-[#FAFAF9]" : ""}`}>
                          {val > 0 ? <span className={isOverdue ? "text-red-500 font-bold" : "text-[#F5A623] font-medium"}>{isOverdue && "⚠ "}{formatCurrency(val).replace("R$","").trim()}</span> : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-right font-bold text-[#F5A623]">{formatCurrency(aReceber)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Recebido vs. Previsto por Mês</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%" barGap={2}>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="Previsto" fill="#F5A623" fillOpacity={0.25} radius={[3,3,0,0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill="#F5A623" fillOpacity={entry.atual ? 0.4 : 0.2} />
                  ))}
                </Bar>
                <Bar dataKey="Recebido" fill="#16a34a" radius={[3,3,0,0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill="#16a34a" fillOpacity={entry.atual ? 1 : 0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {totalPrevisto > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Acumulado {year} — Progresso Geral</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Recebido até hoje</span>
                    <span className="font-bold text-green-600">{formatCurrency(totalRecebido)} ({Math.round((totalRecebido/totalPrevisto)*100)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${Math.min(100,(totalRecebido/totalPrevisto)*100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>A receber (contratos fechados)</span>
                    <span className="font-bold text-[#F5A623]">{formatCurrency(aReceber)} ({Math.round((aReceber/totalPrevisto)*100)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="bg-[#F5A623]/50 h-3 rounded-full transition-all" style={{ width: `${Math.min(100,(aReceber/totalPrevisto)*100)}%` }} />
                  </div>
                </div>
                {totalAtrasado > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Em atraso</span>
                      <span className="font-bold text-red-500">{formatCurrency(totalAtrasado)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-red-400 h-3 rounded-full transition-all" style={{ width: `${Math.min(100,(totalAtrasado/totalPrevisto)*100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── POR PARCELAS ── */}
      {view === "parcelas" && (
        <div className="space-y-4">
          {(!projetos || projetos.length === 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              Nenhum projeto com parcelas cadastradas ainda.
            </div>
          )}
          {projetos?.map((project) => {
            const totalP = project.paymentSchedule.reduce((s, p) => s + Number(p.expectedValue), 0);
            const totalR = project.paymentSchedule.reduce((s, p) => s + Number(p.receivedValue), 0);
            const pct = totalP > 0 ? Math.round((totalR / totalP) * 100) : 0;
            return (
              <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#1A1A1A] bg-[#1A1A1A]/10 px-2 py-0.5 rounded">{project.code}</span>
                      <p className="font-bold text-gray-900 text-sm">{project.name}</p>
                      <button
                        onClick={() => setEditarProjeto({ id: project.id, code: project.code, name: project.name, contractValue: Number(project.contractValue) })}
                        className="text-gray-300 hover:text-[#1A1A1A] transition text-xs"
                        title="Editar projeto"
                      >✏</button>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{project.client.company ?? project.client.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Recebido / Contrato</p>
                      <p className="font-bold text-gray-900 text-sm">
                        <span className="text-green-600">{formatCurrency(totalR)}</span>
                        <span className="text-gray-300 mx-1">/</span>
                        {formatCurrency(Number(project.contractValue))}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-28 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-green-600 font-semibold">{pct}%</span>
                      </div>
                    </div>
                    <a href="/pipeline" className="text-[10px] text-[#1A1A1A] hover:underline font-medium whitespace-nowrap" title="Ver no Processo Comercial">↗ Pipeline</a>
                  </div>
                </div>

                {project.paymentSchedule.length === 0 ? (
                  <div className="px-5 py-4 text-xs text-gray-400 italic">Sem parcelas definidas</div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[680px]">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                        <th className="px-5 py-2 text-left">Parcela</th>
                        <th className="px-3 py-2 text-left">Vencimento</th>
                        <th className="px-3 py-2 text-left">Dt. Pagamento</th>
                        <th className="px-3 py-2 text-right">Previsto</th>
                        <th className="px-3 py-2 text-right">Recebido</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.paymentSchedule.map((p) => {
                        const isOverdue = ["pendente","parcial"].includes(p.status) && p.dueDate && new Date(p.dueDate) < hoje;
                        const pendente = Number(p.expectedValue) - Number(p.receivedValue);
                        return (
                          <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${isOverdue ? "bg-red-50/30" : ""}`}>
                            <td className="px-5 py-2.5 font-medium text-gray-800">{p.description}</td>
                            <td className={`px-3 py-2.5 text-xs ${isOverdue ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                              {p.dueDate ? formatDate(p.dueDate) : "—"}{isOverdue && " ⚠"}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-green-600 font-medium">
                              {p.paidAt ? formatDate(p.paidAt) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(Number(p.expectedValue))}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-green-600">{formatCurrency(Number(p.receivedValue))}</td>
                            <td className="px-3 py-2.5 text-center">
                              <StatusDropdown
                                id={p.id}
                                status={p.status}
                                statusColor={STATUS_COLOR}
                                statusLabel={STATUS_LABEL}
                                onUpdated={() => { refetchParcelas(); refetchAno(); }}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setEditarParcela({ id: p.id, description: p.description, expectedValue: Number(p.expectedValue), receivedValue: Number(p.receivedValue), dueDate: p.dueDate, paidAt: p.paidAt, notes: p.notes })} className="text-xs text-gray-400 hover:text-[#1A1A1A] font-semibold transition" title="Editar parcela">✏</button>
                                {p.status !== "pago" && (
                                  <button onClick={() => setPagamentoModal({ id: p.id, desc: `${project.name} — ${p.description}`, pendente })} className="text-xs text-[#F5A623] font-semibold hover:underline whitespace-nowrap">
                                    + Registrar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td colSpan={2} className="px-5 py-2 text-xs font-bold text-gray-500 uppercase">Total</td>
                        <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">{formatCurrency(totalP)}</td>
                        <td className="px-3 py-2 text-right text-xs font-bold text-green-600">{formatCurrency(totalR)}</td>
                        <td colSpan={2} className="px-3 py-2 text-right">
                          <button onClick={() => setNovaParcelaProject(project.id)} className="text-xs text-[#1A1A1A] font-semibold hover:underline">
                            + Parcela
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── GESTÃO DO ESCRITÓRIO ── */}
      {view === "escritorio" && <EscritorioTab year={year} />}

      {pagamentoModal && <PagamentoModal parcelaId={pagamentoModal.id} descricao={pagamentoModal.desc} valorPendente={pagamentoModal.pendente} onClose={() => setPagamentoModal(null)} onSuccess={refetch} />}
      {novaParcelaProject && <NovaParcela projectId={novaParcelaProject} onClose={() => setNovaParcelaProject(null)} onSuccess={refetch} />}
      {editarParcela && <EditarParcelaModal parcela={editarParcela} onClose={() => setEditarParcela(null)} onSuccess={refetch} />}
      {editarProjeto && <EditarProjetoModal project={editarProjeto} onClose={() => setEditarProjeto(null)} onSuccess={refetch} />}
    </div>
  );
}
