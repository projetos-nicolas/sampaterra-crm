"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/trpc/client";
import { ProposalStatus } from "@prisma/client";
import { useSession } from "next-auth/react";
import { PdfModal } from "./PdfModal";

// ─── tipos auxiliares ─────────────────────────────────────────────────────────

type ProposalItem = {
  id?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sortOrder: number;
};

type FormData = {
  code: string;
  leadId: string;
  clientId: string;
  title: string;
  validUntil: string;
  notes: string;
  items: ProposalItem[];
};

type StatusChangeModal = {
  proposalId: string;
  newStatus: ProposalStatus;
  title: string;
};

// ─── constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_negociacao: "Em negociação",
  aprovada: "Aprovada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  rascunho: "bg-gray-100 text-gray-600",
  enviada: "bg-blue-100 text-blue-700",
  em_negociacao: "bg-yellow-100 text-yellow-700",
  aprovada: "bg-green-100 text-green-700",
  recusada: "bg-red-100 text-red-700",
  cancelada: "bg-gray-100 text-gray-500",
};

const TABS: Array<{ key: ProposalStatus | "todas"; label: string }> = [
  { key: "todas", label: "Todas" },
  { key: "rascunho", label: "Rascunho" },
  { key: "enviada", label: "Enviadas" },
  { key: "em_negociacao", label: "Em negociação" },
  { key: "aprovada", label: "Aprovadas" },
  { key: "recusada", label: "Recusadas" },
];

// Tabs visíveis para clientes (sem rascunho, recusada)
const TABS_CLIENT: Array<{ key: ProposalStatus | "todas"; label: string }> = [
  { key: "todas", label: "Todas" },
  { key: "enviada", label: "Enviadas" },
  { key: "em_negociacao", label: "Em negociação" },
  { key: "aprovada", label: "Aprovadas" },
];

const EMPTY_ITEM = (): ProposalItem => ({
  description: "",
  unit: "",
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  sortOrder: 0,
});

const UNIT_OPTIONS = ["m²", "m", "un", "vb", "kg", "t", "h", "mês", "caminhões", "diária"];

// ─── formatadores ─────────────────────────────────────────────────────────────

function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function PropostasPage() {
  const { data: session } = useSession();
  const isClient = (session?.user as any)?.role === "client";
  const [activeTab, setActiveTab] = useState<ProposalStatus | "todas">("todas");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pdfProposalId, setPdfProposalId] = useState<string | null>(null);
  const [statusChangeModal, setStatusChangeModal] =
    useState<StatusChangeModal | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // queries
  const { data: proposals, refetch } = trpc.proposals.list.useQuery({
    status: activeTab === "todas" ? undefined : activeTab,
    search: debouncedSearch || undefined,
  });

  const { data: statusCounts } = trpc.proposals.statusCounts.useQuery();

  // mutations
  const updateStatus = trpc.proposals.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      setStatusChangeModal(null);
      setRejectionReason("");
    },
  });

  const deleteProposal = trpc.proposals.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleStatusAction = (
    proposalId: string,
    newStatus: ProposalStatus,
    title: string
  ) => {
    if (newStatus === "recusada") {
      setStatusChangeModal({ proposalId, newStatus, title });
    } else {
      updateStatus.mutate({ id: proposalId, status: newStatus });
    }
  };

  const confirmStatusChange = () => {
    if (!statusChangeModal) return;
    updateStatus.mutate({
      id: statusChangeModal.proposalId,
      status: statusChangeModal.newStatus,
      rejectionReason: rejectionReason || undefined,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 uppercase tracking-wide">
            Propostas
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Orçamentos e propostas técnicas
          </p>
        </div>
        {!isClient && (
          <button
            onClick={() => { setEditingId(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg transition whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nova Proposta
          </button>
        )}
      </div>

      {/* Tabs de status */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto max-w-full">
        {(isClient ? TABS_CLIENT : TABS).map((tab) => {
          const count =
            tab.key === "todas"
              ? Object.values(statusCounts ?? {}).reduce(
                  (s, n) => s + (n ?? 0),
                  0
                )
              : (statusCounts?.[tab.key as ProposalStatus] ?? 0);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap -mb-px ${
                activeTab === tab.key
                  ? "border-[#1A1A1A] text-[#1A1A1A]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key
                      ? "bg-[#1A1A1A]/10 text-[#1A1A1A]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barra de busca */}
      <div className="relative mb-4">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por código, título ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1">
        {!proposals ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Carregando...
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-[#1A1A1A]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1A1A1A"
                strokeWidth="2"
                className="w-6 h-6"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">
              Nenhuma proposta encontrada
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {activeTab === "todas"
                ? isClient
                  ? "Você ainda não possui propostas."
                  : "Crie a primeira proposta clicando em Nova Proposta."
                : `Não há propostas com status "${STATUS_LABELS[activeTab as ProposalStatus]}".`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Código
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Título / Cliente
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Valor Total
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Validade
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Itens
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <ProposalRow
                  key={p.id}
                  proposal={p}
                  onEdit={() => {
                    setEditingId(p.id);
                    setShowModal(true);
                  }}
                  onStatusAction={handleStatusAction}
                  onGeneratePdf={() => setPdfProposalId(p.id)}
                  isAdmin={(session?.user as any)?.role === "admin"}
                  onDelete={() => {
                    if (
                      confirm(
                        `Excluir a proposta "${p.code}"? Esta ação não pode ser desfeita.`
                      )
                    ) {
                      deleteProposal.mutate({ id: p.id });
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal criação/edição */}
      {showModal && (
        <ProposalModal
          editingId={editingId}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            refetch();
          }}
        />
      )}

      {/* Modal PDF */}
      {pdfProposalId && (
        <PdfModal
          proposalId={pdfProposalId}
          onClose={() => setPdfProposalId(null)}
        />
      )}

      {/* Modal confirmação de recusa */}
      {statusChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-2">
              Recusar Proposta
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Registre o motivo da recusa de{" "}
              <span className="font-semibold">{statusChangeModal.title}</span>.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Motivo da recusa (opcional)..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setStatusChangeModal(null);
                  setRejectionReason("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={updateStatus.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── linha da tabela ──────────────────────────────────────────────────────────

function ProposalRow({
  proposal,
  onEdit,
  onStatusAction,
  onGeneratePdf,
  onDelete,
  isAdmin,
}: {
  proposal: any;
  onEdit: () => void;
  onStatusAction: (id: string, status: ProposalStatus, title: string) => void;
  onGeneratePdf: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const canEdit = true;
  const canDelete = isAdmin && proposal.status === "rascunho";

  const ALL_STATUSES: ProposalStatus[] = ["rascunho", "enviada", "em_negociacao", "aprovada", "recusada", "cancelada"];
  const nextStatuses = ALL_STATUSES.filter(s => s !== proposal.status);

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition">
      <td className="px-4 py-3 font-mono text-xs text-gray-500">
        {proposal.code}
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-900">{proposal.title}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {proposal.client.company || proposal.client.name}
        </div>
      </td>
      <td className="px-4 py-3">
        {/* Badge de status clicável */}
        <div className="relative inline-block">
          <button
            onClick={() => nextStatuses.length > 0 && setStatusMenuOpen(v => !v)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${
              STATUS_COLORS[proposal.status as ProposalStatus]
            } ${nextStatuses.length > 0 ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
          >
            {STATUS_LABELS[proposal.status as ProposalStatus]}
            {nextStatuses.length > 0 && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            )}
          </button>
          {statusMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
              <div className="absolute left-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px]">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Alterar para
                </div>
                {nextStatuses.map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusMenuOpen(false);
                      onStatusAction(proposal.id, st, proposal.title);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                      st === "recusada" ? "text-red-600" : st === "aprovada" ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      st === "aprovada" ? "bg-green-500" :
                      st === "recusada" ? "bg-red-500" :
                      st === "enviada" ? "bg-blue-500" :
                      st === "em_negociacao" ? "bg-yellow-500" : "bg-gray-400"
                    }`}/>
                    {STATUS_LABELS[st]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-semibold text-gray-900">
        {formatBRL(proposal.totalValue)}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {formatDate(proposal.validUntil)}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {proposal._count.items} item{proposal._count.items !== 1 ? "s" : ""}
      </td>
      <td className="px-4 py-3">
        <div className="relative flex justify-end">
          <button
            onClick={() => setActionsOpen((v) => !v)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {actionsOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setActionsOpen(false)}
              />
              <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                {canEdit && (
                  <button
                    onClick={() => { setActionsOpen(false); onEdit(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Editar
                  </button>
                )}
                <button
                  onClick={() => { setActionsOpen(false); onGeneratePdf(); }}
                  className="w-full text-left px-4 py-2 text-sm text-[#F5A623] hover:bg-orange-50 flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  Gerar PDF
                </button>
                {canDelete && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => { setActionsOpen(false); onDelete(); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── modal de criação/edição ──────────────────────────────────────────────────

function ProposalModal({
  editingId,
  onClose,
  onSaved,
}: {
  editingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editingId;

  const { data: leads } = trpc.proposals.getLeadsForSelect.useQuery();
  const { data: scopeTemplates } = trpc.proposals.getScopeTemplates.useQuery();
  const { data: existingProposal } = trpc.proposals.getById.useQuery(
    { id: editingId! },
    { enabled: isEdit }
  );
  const { data: nextCode } = trpc.proposals.nextCode.useQuery(undefined, {
    enabled: !isEdit,
  });

  const [form, setForm] = useState<FormData>({
    code: "",
    leadId: "",
    clientId: "",
    title: "",
    validUntil: "",
    notes: "",
    items: [EMPTY_ITEM()],
  });
  const [showTemplates, setShowTemplates] = useState(false);

  // pré-preenche código no novo
  useEffect(() => {
    if (!isEdit && nextCode) {
      setForm((f) => ({ ...f, code: f.code || nextCode }));
    }
  }, [nextCode, isEdit]);

  // preenche form ao editar
  useEffect(() => {
    if (existingProposal) {
      setForm({
        code: existingProposal.code,
        leadId: existingProposal.leadId,
        clientId: existingProposal.clientId,
        title: existingProposal.title,
        validUntil: existingProposal.validUntil
          ? new Date(existingProposal.validUntil).toISOString().split("T")[0]
          : "",
        notes: existingProposal.notes ?? "",
        items: existingProposal.items.map((i: any) => ({
          id: i.id,
          description: i.description,
          unit: i.unit ?? "",
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          totalPrice: parseFloat(i.totalPrice),
          sortOrder: i.sortOrder,
        })),
      });
    }
  }, [existingProposal]);

  const createMutation = trpc.proposals.create.useMutation({
    onSuccess: onSaved,
  });
  const updateMutation = trpc.proposals.update.useMutation({
    onSuccess: onSaved,
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const totalValue = form.items.reduce((s, i) => s + i.totalPrice, 0);

  // seleciona lead → preenche clientId automaticamente
  const handleLeadChange = (leadId: string) => {
    const lead = leads?.find((l) => l.id === leadId);
    setForm((f) => ({
      ...f,
      leadId,
      clientId: lead?.clientId ?? "",
      title: f.title || (lead?.title ?? ""),
    }));
  };

  const updateItem = (index: number, field: keyof ProposalItem, value: any) => {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [field]: value };
      // recalcula total
      if (field === "quantity" || field === "unitPrice") {
        items[index].totalPrice =
          items[index].quantity * items[index].unitPrice;
      }
      return { ...f, items };
    });
  };

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { ...EMPTY_ITEM(), sortOrder: f.items.length }],
    }));
  };

  const removeItem = (index: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  };

  const addFromTemplate = (tpl: any) => {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          description: tpl.name,
          unit: tpl.unit ?? "",
          quantity: 1,
          unitPrice: parseFloat(tpl.basePrice ?? "0"),
          totalPrice: parseFloat(tpl.basePrice ?? "0"),
          sortOrder: f.items.length,
        },
      ],
    }));
    setShowTemplates(false);
  };

  const handleSubmit = () => {
    if (!form.leadId || !form.clientId || !form.title) return;
    const payload = {
      code: form.code || undefined,
      leadId: form.leadId,
      clientId: form.clientId,
      title: form.title,
      validUntil: form.validUntil
        ? new Date(form.validUntil).toISOString()
        : undefined,
      notes: form.notes || undefined,
      items: form.items.map((i, idx) => ({
        ...i,
        sortOrder: idx,
      })),
    };

    if (isEdit) {
      updateMutation.mutate({ id: editingId!, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // agrupa templates por categoria
  const templatesByCategory: Record<string, any[]> = {};
  scopeTemplates?.forEach((t) => {
    if (!templatesByCategory[t.category]) templatesByCategory[t.category] = [];
    templatesByCategory[t.category].push(t);
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
        {/* Header do modal */}
        <div className="flex items-center justify-between gap-3 flex-wrap p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? "Editar Proposta" : "Nova Proposta"}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {isEdit
                ? "Atualize os dados e itens da proposta"
                : "Preencha os dados e adicione os itens de escopo"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Seção dados gerais */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Dados Gerais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Código */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Código da Proposta
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value }))
                  }
                  placeholder="PROP-2026-001"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                />
              </div>

              {/* Lead */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Lead *
                </label>
                <select
                  value={form.leadId}
                  onChange={(e) => handleLeadChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                >
                  <option value="">Selecione o lead...</option>
                  {leads?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} — {l.client.company || l.client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Título */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Título da Proposta *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Ex: Estrutura Metálica Galpão Logístico"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                />
              </div>

              {/* Validade */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Válida até
                </label>
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, validUntil: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Condições, prazo de entrega, etc."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                />
              </div>
            </div>
          </div>

          {/* Seção itens */}
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Itens de Escopo
              </h3>
              <div className="flex gap-2 flex-wrap">
                {scopeTemplates && scopeTemplates.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplates((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1A1A1A] border border-[#1A1A1A]/30 rounded-lg hover:bg-[#1A1A1A]/5 transition"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-3.5 h-3.5"
                      >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                      Biblioteca de Escopos
                    </button>
                    {showTemplates && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowTemplates(false)}
                        />
                        <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-72 max-h-72 overflow-y-auto py-2">
                          {Object.entries(templatesByCategory).map(
                            ([cat, items]) => (
                              <div key={cat}>
                                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  {cat.replace(/_/g, " ")}
                                </div>
                                {items.map((tpl) => (
                                  <button
                                    key={tpl.id}
                                    onClick={() => addFromTemplate(tpl)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex justify-between items-center"
                                  >
                                    <span>{tpl.name}</span>
                                    {tpl.basePrice && (
                                      <span className="text-xs text-gray-400">
                                        {formatBRL(tpl.basePrice)}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] rounded-lg hover:bg-[#0a3a37] transition"
                >
                  + Adicionar Item
                </button>
              </div>
            </div>

            {/* Tabela de itens (scroll horizontal em mobile) */}
            <div className="overflow-x-auto">
            <div className="min-w-[640px]">
            <div className="bg-gray-50 rounded-t-lg border border-gray-200 grid grid-cols-[1fr_80px_100px_110px_110px_36px] gap-2 px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              <span>Descrição</span>
              <span>Unid.</span>
              <span>Qtde</span>
              <span>Preço Unit.</span>
              <span>Total</span>
              <span />
            </div>

            {/* Linhas de itens */}
            <div className="border-x border-b border-gray-200 rounded-b-lg divide-y divide-gray-100">
              {form.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_80px_100px_110px_110px_36px] gap-2 px-3 py-2 items-center"
                >
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Descrição do serviço... *"
                    className={`border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 w-full ${!item.description.trim() ? "border-red-300 focus:ring-red-300 bg-red-50/50" : "border-gray-200 focus:ring-[#1A1A1A]/30"}`}
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30 w-full"
                  >
                    <option value="">—</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30 w-full text-right"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30 w-full text-right"
                  />
                  <div className="text-sm text-right font-semibold text-gray-700 pr-1">
                    {formatBRL(item.totalPrice)}
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    disabled={form.items.length === 1}
                    className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-0 disabled:pointer-events-none transition"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            </div>
            </div>

            {/* Total */}
            <div className="flex justify-end mt-3">
              <div className="bg-[#1A1A1A]/5 rounded-lg px-5 py-3 text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">
                  Valor Total da Proposta
                </div>
                <div className="text-xl font-extrabold text-[#1A1A1A]">
                  {formatBRL(totalValue)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer do modal */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !form.leadId || !form.title || form.items.length === 0 || form.items.some(i => !i.description.trim())}
            className="px-6 py-2 text-sm font-semibold text-white bg-[#F5A623] hover:bg-[#F7BB52] rounded-lg transition disabled:opacity-50"
          >
            {isPending ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Proposta"}
          </button>
        </div>
      </div>
    </div>
  );
}
