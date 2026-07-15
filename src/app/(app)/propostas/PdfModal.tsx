"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { trpc } from "@/trpc/client";
import type { PDFSection, PagamentoItem, BankInfo } from "@/lib/pdf/PropostaPDF";
import { DEFAULT_BANK_INFO } from "@/lib/pdf/PropostaPDF";

const PDFPreviewPanel = dynamic(() => import("./PDFPreviewPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
      <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
      </svg>
      <span className="text-sm">Carregando preview...</span>
    </div>
  ),
});

interface EditableSection extends PDFSection {
  enabled: boolean;
  expanded: boolean;
}

function buildDefaultSections(scopeText: string): EditableSection[] {
  return [
    {
      id: "objetivo",
      title: "Objetivo do Contrato",
      content:
        "O objeto da presente proposta é a prestação de serviços técnicos de engenharia estrutural, compreendendo o desenvolvimento do projeto estrutural completo conforme escopo detalhado abaixo.",
      type: "text",
      enabled: true,
      expanded: false,
    },
    {
      id: "escopo",
      title: "Detalhamento do Escopo",
      content: scopeText,
      type: "text",
      enabled: true,
      expanded: false,
    },
    {
      id: "metodologia",
      title: "Metodologia e Diretrizes Técnicas",
      content:
        "- Todos os projetos seguem as normas técnicas vigentes da ABNT\n- NBR 6118 - Projeto de estruturas de concreto\n- NBR 7480 - Barras e fios de aço destinados a armaduras\n- NBR 6120 - Cargas para o cálculo de estruturas\n- Utilização de softwares homologados (TQS, Eberick ou similar)\n- Emissão de ART/RRT pelo engenheiro responsável",
      type: "text",
      enabled: true,
      expanded: false,
    },
    {
      id: "prazos",
      title: "Prazos",
      content:
        "O prazo de execução dos serviços é de 30 (trinta) dias corridos a partir da assinatura e do recebimento das informações necessárias pelo CONTRATANTE.",
      type: "text",
      enabled: true,
      expanded: false,
    },
    {
      id: "pagamento",
      title: "Investimento e Pagamento",
      content: "",
      type: "pagamento",
      enabled: true,
      expanded: false,
    },
    {
      id: "obrig_contratante",
      title: "Obrigações do Contratante",
      content:
        "- Fornecer todas as informações técnicas necessárias\n- Efetuar os pagamentos nas condições estabelecidas\n- Designar responsável para acompanhamento dos serviços\n- Informar previamente qualquer alteração de escopo",
      type: "text",
      enabled: true,
      expanded: false,
    },
    {
      id: "obrig_contratada",
      title: "Obrigações da Contratada",
      content:
        "- Executar os serviços com qualidade técnica e dentro do prazo acordado\n- Designar profissional habilitado como responsável técnico\n- Emitir ART/RRT junto ao respectivo conselho de classe\n- Manter sigilo sobre informações confidenciais do CONTRATANTE",
      type: "text",
      enabled: true,
      expanded: false,
    },
    {
      id: "vigencia",
      title: "Vigência da Proposta",
      content: "A presente proposta tem validade de 30 (trinta) dias corridos a partir da data de sua emissão.",
      type: "text",
      enabled: true,
      expanded: false,
    },
    {
      id: "multas",
      title: "Multas, Inadimplemento e Rescisão",
      content:
        "O não pagamento nas datas acordadas ensejará multa de 2% sobre o valor em atraso, acrescida de juros de 1% ao mês. A rescisão antecipada por parte do CONTRATANTE implica o pagamento dos serviços já realizados, acrescidos de 20% a título de perdas e danos.",
      type: "text",
      enabled: true,
      expanded: false,
    },
    {
      id: "foro",
      title: "Foro de Eleição",
      content: "As partes elegem o Foro da Comarca de Diadema - SP para dirimir quaisquer dúvidas ou litígios oriundos do presente instrumento.",
      type: "text",
      enabled: true,
      expanded: false,
    },
  ];
}

interface Props {
  proposalId: string;
  onClose: () => void;
}

export function PdfModal({ proposalId, onClose }: Props) {
  const { data: proposal, isLoading } = trpc.proposals.getByIdForPdf.useQuery({ id: proposalId });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-[#1A1A1A]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!proposal) return null;
  return <PdfEditor proposal={proposal} onClose={onClose} />;
}

function PdfEditor({ proposal, onClose }: { proposal: any; onClose: () => void }) {
  const client = proposal.client;

  const initialScope = (proposal.items as any[])
    .map((item) => "- " + item.description + " — " + item.quantity + " " + (item.unit || "un"))
    .join("\n");

  const [sections, setSections] = useState<EditableSection[]>(() => buildDefaultSections(initialScope));

  const [pagamentos, setPagamentos] = useState<PagamentoItem[]>(() => {
    const count = (proposal.items as any[]).length;
    if (count === 0) return [{ descricao: "Pagamento único", valor: proposal.totalValue, ordem: 1 }];
    const perItem = proposal.totalValue / count;
    return (proposal.items as any[]).map((item, i) => ({
      descricao: "Parcela " + (i + 1) + " — " + item.description,
      valor: parseFloat(perItem.toFixed(2)),
      ordem: i + 1,
    }));
  });

  const [bankInfo, setBankInfo] = useState<BankInfo>({ ...DEFAULT_BANK_INFO });
  const [paymentNotes, setPaymentNotes] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const contacts: any[] = (client as any).contacts ?? [];
  // Contato selecionado para aparecer na proposta (null = dados do cliente principal)
  const primaryContact = contacts.find((c: any) => c.isPrimary) ?? null;
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    primaryContact?.id ?? null
  );
  const selectedContact = contacts.find((c: any) => c.id === selectedContactId) ?? null;
  const imgRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"secoes" | "pagamento" | "imagens" | "preview">("secoes");
  const [downloading, setDownloading] = useState(false);

  const clientAddress = [
    client.address,
    client.addressNumber,
    client.complement,
    client.city && client.state ? client.city + " - " + client.state : client.city || client.state,
    client.cep,
  ]
    .filter(Boolean)
    .join(", ");

  const pdfData = useMemo(() => ({
    code: proposal.code,
    title: proposal.title,
    date: new Date().toLocaleDateString("pt-BR"),
    clientName: client.name,
    clientCompany: client.company || undefined,
    clientCnpj: client.cpf_cnpj || undefined,
    // Se um contato foi selecionado, usa os dados dele; caso contrário usa o cliente
    clientPhone: (selectedContact?.phone || client.phone) || undefined,
    clientEmail: (selectedContact?.email || client.email) || undefined,
    clientContactName: selectedContact ? selectedContact.name : undefined,
    clientContactRole: selectedContact?.role || undefined,
    clientAddress: clientAddress || undefined,
    sections: sections
      .filter((s) => s.enabled)
      .map(({ id, title, content, type }) => ({ id, title, content, type })),
    valorTotal: proposal.totalValue,
    pagamentos,
    paymentNotes: paymentNotes.trim() || undefined,
    imagens,
    bankInfo,
  }), [proposal, client, clientAddress, sections, pagamentos, paymentNotes, imagens, bankInfo, selectedContact]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const [{ pdf }, { PropostaPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/PropostaPDF"),
      ]);
      // @ts-ignore
      const blob = await pdf(<PropostaPDF data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = proposal.code + " - " + proposal.title + ".pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [pdfData, proposal.code, proposal.title]);

  const toggleSec = (id: string) =>
    setSections((p) => p.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  const deleteSec = (id: string) =>
    setSections((p) => p.filter((s) => s.id !== id));
  const updateSec = (id: string, field: keyof EditableSection, value: any) =>
    setSections((p) => p.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  const expandSec = (id: string) =>
    setSections((p) => p.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)));

  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach((f) => {
      const r = new FileReader();
      r.onload = (ev) => setImagens((p) => [...p, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const totalPag = pagamentos.reduce((s, p) => s + p.valor, 0);
  const diff = Math.abs(totalPag - proposal.totalValue) > 0.5;
  const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  let counter = 0;

  const TABS = [
    { id: "secoes" as const, label: "Seções" },
    { id: "pagamento" as const, label: "Pagamento" },
    { id: "imagens" as const, label: "Imagens" },
    { id: "preview" as const, label: "Preview" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex flex-col overflow-hidden"
        style={{ maxHeight: "calc(100vh - 2rem)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Gerar PDF</h2>
            <p className="text-sm text-gray-500 truncate">{proposal.code} · {proposal.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-[#F5A623] text-white text-sm font-semibold rounded-lg hover:bg-[#d04c14] disabled:opacity-60 transition-colors"
            >
              {downloading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Baixar PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-gray-50 shrink-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap " +
                (tab === t.id
                  ? "border-[#1A1A1A] text-[#1A1A1A]"
                  : "border-transparent text-gray-500 hover:text-gray-700")
              }
            >
              {t.label}
              {t.id === "imagens" && imagens.length > 0 && (
                <span className="ml-1.5 text-xs bg-[#F5A623] text-white rounded-full px-1.5 py-0.5">
                  {imagens.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">

          {/* Secoes */}
          {tab === "secoes" && (
            <div className="p-6 space-y-2">
              <p className="text-xs text-gray-500 mb-4">
                Ative/desative ou apague seções. A numeração se ajusta automaticamente.
              </p>
              {sections.map((sec) => {
                const num = sec.enabled ? ++counter : null;
                return (
                  <div
                    key={sec.id}
                    className={
                      "rounded-xl border " +
                      (sec.enabled ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50 opacity-60")
                    }
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold bg-[#1A1A1A]/10 text-[#1A1A1A] shrink-0">
                        {num !== null ? num : "-"}
                      </span>
                      <button
                        onClick={() => expandSec(sec.id)}
                        className="flex-1 text-left text-sm font-medium text-gray-800 flex items-center gap-2 min-w-0"
                      >
                        <span className="truncate">{sec.title}</span>
                        {sec.type === "pagamento" && (
                          <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-[#F5A623]/10 text-[#F5A623] font-semibold">
                            PAG
                          </span>
                        )}
                        <svg
                          className={"w-4 h-4 text-gray-400 ml-auto shrink-0 transition-transform " + (sec.expanded ? "rotate-180" : "")}
                          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleSec(sec.id)}
                        className={"w-10 h-5 rounded-full relative shrink-0 transition-colors " + (sec.enabled ? "bg-[#1A1A1A]" : "bg-gray-300")}
                      >
                        <span className={"absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform " + (sec.enabled ? "translate-x-5" : "")} />
                      </button>
                      <button
                        onClick={() => deleteSec(sec.id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {sec.expanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Título</label>
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) => updateSec(sec.id, "title", e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                          />
                        </div>
                        {sec.type !== "pagamento" ? (
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Conteúdo
                              <span className="ml-1 font-normal normal-case text-gray-400">(linhas com - ou * viram tópicos)</span>
                            </label>
                            <textarea
                              value={sec.content}
                              onChange={(e) => updateSec(sec.id, "content", e.target.value)}
                              rows={6}
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 resize-y"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            Configure as condições na aba Pagamento.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() =>
                  setSections((p) => [
                    ...p,
                    {
                      id: "custom_" + Date.now(),
                      title: "Nova Cláusula",
                      content: "",
                      type: "text",
                      enabled: true,
                      expanded: true,
                    },
                  ])
                }
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#1A1A1A]/30 text-[#1A1A1A] text-sm font-medium hover:border-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 transition-colors mt-2"
              >
                + Adicionar Seção
              </button>
            </div>
          )}

          {/* Pagamento */}
          {tab === "pagamento" && (
            <div className="p-6">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Condições de Pagamento</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Valor total: <strong className="text-[#1A1A1A]">{brl(proposal.totalValue)}</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const n = pagamentos.length + 1;
                      const pct = parseFloat((100 / n).toFixed(4));
                      const newVal = parseFloat((proposal.totalValue * pct / 100).toFixed(2));
                      const equal = parseFloat((proposal.totalValue / n).toFixed(2));
                      // Redistribuir igualmente
                      setPagamentos((prev) => {
                        const updated = [...prev, { descricao: "Parcela " + n, valor: equal, ordem: n }];
                        const totalFixed = updated.slice(0, -1).reduce((s, p) => s + parseFloat((proposal.totalValue / n).toFixed(2)), 0);
                        const last = parseFloat((proposal.totalValue - totalFixed).toFixed(2));
                        return updated.map((p, i) => i === updated.length - 1 ? { ...p, valor: last } : { ...p, valor: parseFloat((proposal.totalValue / n).toFixed(2)) });
                      });
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Distribuir valor igualmente entre as parcelas"
                  >
                    = Igualar
                  </button>
                  <button
                    onClick={() =>
                      setPagamentos((p) => [
                        ...p,
                        { descricao: "Parcela " + (p.length + 1), valor: 0, ordem: p.length + 1 },
                      ])
                    }
                    className="px-3 py-1.5 text-sm bg-[#1A1A1A] text-white rounded-lg hover:bg-[#0a3835] transition-colors"
                  >
                    + Parcela
                  </button>
                </div>
              </div>
              {diff && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                  Atenção: soma das parcelas ({brl(totalPag)}) difere do valor total.
                </div>
              )}
              <div className="space-y-3">
                {pagamentos.map((p, i) => {
                  const pct = proposal.totalValue > 0 ? (p.valor / proposal.totalValue) * 100 : 0;
                  return (
                    <div key={i} className="flex gap-2 items-end flex-wrap sm:flex-nowrap">
                      <div className="flex-1 min-w-[180px]">
                        <label className="text-xs text-gray-500">Descrição</label>
                        <input
                          type="text"
                          value={p.descricao}
                          onChange={(e) =>
                            setPagamentos((prev) =>
                              prev.map((pp, ii) => (ii === i ? { ...pp, descricao: e.target.value } : pp))
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-gray-500">%</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={parseFloat(pct.toFixed(4))}
                          onChange={(e) => {
                            const newPct = parseFloat(e.target.value) || 0;
                            const newVal = parseFloat((proposal.totalValue * newPct / 100).toFixed(2));
                            setPagamentos((prev) =>
                              prev.map((pp, ii) => ii === i ? { ...pp, valor: newVal } : pp)
                            );
                          }}
                          className="mt-1 w-full rounded-lg border border-[#F5A623]/60 bg-[#F5A623]/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 text-center font-semibold"
                        />
                      </div>
                      <div className="w-36">
                        <label className="text-xs text-gray-500">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={p.valor}
                          onChange={(e) =>
                            setPagamentos((prev) =>
                              prev.map((pp, ii) =>
                                ii === i ? { ...pp, valor: parseFloat(e.target.value) || 0 } : pp
                              )
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                        />
                      </div>
                      <button
                        onClick={() => setPagamentos((prev) => prev.filter((_, ii) => ii !== i))}
                        className="mb-0.5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Total %: <span className={`font-semibold ${Math.abs(pagamentos.reduce((s,p)=>s+(proposal.totalValue>0?(p.valor/proposal.totalValue)*100:0),0)-100)>0.1?"text-yellow-600":"text-green-600"}`}>
                    {pagamentos.reduce((s,p)=>s+(proposal.totalValue>0?(p.valor/proposal.totalValue)*100:0),0).toFixed(1)}%
                  </span>
                </p>
                <div className={"text-sm font-semibold px-4 py-2 rounded-lg " + (diff ? "bg-yellow-100 text-yellow-700" : "bg-[#1A1A1A]/10 text-[#1A1A1A]")}>
                  Total: {brl(totalPag)}
                </div>
              </div>

              {/* Observações de pagamento */}
              <div className="mt-6 pt-5 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Observações de Pagamento</h3>
                <p className="text-xs text-gray-500 mb-2">
                  Texto livre exibido abaixo da tabela de parcelas no PDF (ex: "O sinal deverá ser pago antes do início dos serviços", prazo de vencimento, forma de pagamento, multas por atraso, etc.). Deixe em branco para não exibir.
                </p>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={4}
                  placeholder={"Ex: O sinal deverá ser pago mediante assinatura do contrato.\nAs demais parcelas vencem todo dia 10 de cada mês.\nAtraso superior a 5 dias úteis sujeito a multa de 2% + juros de 1% a.m."}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 resize-y font-mono leading-relaxed"
                />
              </div>

              {/* Seletor de contato */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Contato na Proposta</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Escolha quem entrou em contato — nome e dados aparecerão no PDF.
                </p>
                <div className="space-y-2">
                  {/* Opção: dados do cliente (sem contato específico) */}
                  <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ borderColor: selectedContactId === null ? "#1A1A1A" : "#e5e7eb", background: selectedContactId === null ? "#1A1A1A08" : "" }}
                  >
                    <input
                      type="radio"
                      name="contact"
                      checked={selectedContactId === null}
                      onChange={() => setSelectedContactId(null)}
                      className="accent-[#1A1A1A]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{client.company || client.name}</p>
                      <p className="text-xs text-gray-400">Dados gerais do cliente</p>
                    </div>
                  </label>
                  {contacts.map((c: any) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
                      style={{ borderColor: selectedContactId === c.id ? "#1A1A1A" : "#e5e7eb", background: selectedContactId === c.id ? "#1A1A1A08" : "" }}
                    >
                      <input
                        type="radio"
                        name="contact"
                        checked={selectedContactId === c.id}
                        onChange={() => setSelectedContactId(c.id)}
                        className="accent-[#1A1A1A]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                          {c.isPrimary && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#F5A623]/15 text-[#b8680e] rounded-full">Principal</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{[c.role, c.email, c.phone].filter(Boolean).join(" · ")}</p>
                      </div>
                    </label>
                  ))}
                  {contacts.length === 0 && (
                    <p className="text-xs text-gray-400 italic">Nenhum contato cadastrado para este cliente.</p>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Dados Bancários</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Exibidos no PDF, no quadro "Dados para Pagamento".
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500">Empresa</label>
                    <input
                      type="text"
                      value={bankInfo.empresa}
                      onChange={(e) => setBankInfo((p) => ({ ...p, empresa: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Banco</label>
                    <input
                      type="text"
                      value={bankInfo.banco}
                      onChange={(e) => setBankInfo((p) => ({ ...p, banco: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">CNPJ</label>
                    <input
                      type="text"
                      value={bankInfo.cnpj}
                      onChange={(e) => setBankInfo((p) => ({ ...p, cnpj: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Agência</label>
                    <input
                      type="text"
                      value={bankInfo.agencia}
                      onChange={(e) => setBankInfo((p) => ({ ...p, agencia: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Conta</label>
                    <input
                      type="text"
                      value={bankInfo.conta}
                      onChange={(e) => setBankInfo((p) => ({ ...p, conta: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Imagens */}
          {tab === "imagens" && (
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Cada imagem adicionada vira uma página completa no PDF.
              </p>
              <input ref={imgRef} type="file" accept="image/*" multiple onChange={addImage} className="hidden" />
              <button
                onClick={() => imgRef.current?.click()}
                className="mb-6 flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#0a3835] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Adicionar Imagens</span>
              </button>
              {imagens.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
                  Nenhuma imagem adicionada.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imagens.map((src, i) => (
                    <div
                      key={i}
                      className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
                      style={{ aspectRatio: "16/9" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={"img" + i} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <button
                          onClick={() => setImagens((p) => p.filter((_, j) => j !== i))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                        {"Pag. " + (i + 1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {tab === "preview" && (
            <div style={{ height: "70vh" }}>
              <PDFPreviewPanel data={pdfData} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
