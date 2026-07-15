"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { trpc } from "@/trpc/client";
import type { PDFSection, PagamentoItem, BankInfo, ImageSlot, ImagePage } from "@/lib/pdf/PropostaPDF";
import { DEFAULT_BANK_INFO } from "@/lib/pdf/PropostaPDF";
import { InteractivePDFCanvas } from "./InteractivePDFCanvas";

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
  pageBreakBefore: boolean;
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
      pageBreakBefore: false,
    },
    {
      id: "escopo",
      title: "Detalhamento do Escopo",
      content: scopeText,
      type: "text",
      enabled: true,
      expanded: false,
      pageBreakBefore: false,
    },
    {
      id: "metodologia",
      title: "Metodologia e Diretrizes Técnicas",
      content:
        "- Todos os projetos seguem as normas técnicas vigentes da ABNT\n- NBR 6118 - Projeto de estruturas de concreto\n- NBR 7480 - Barras e fios de aço destinados a armaduras\n- NBR 6120 - Cargas para o cálculo de estruturas\n- Utilização de softwares homologados (TQS, Eberick ou similar)\n- Emissão de ART/RRT pelo engenheiro responsável",
      type: "text",
      enabled: true,
      expanded: false,
      pageBreakBefore: false,
    },
    {
      id: "prazos",
      title: "Prazos",
      content:
        "O prazo de execução dos serviços é de 30 (trinta) dias corridos a partir da assinatura e do recebimento das informações necessárias pelo CONTRATANTE.",
      type: "text",
      enabled: true,
      expanded: false,
      pageBreakBefore: false,
    },
    {
      id: "pagamento",
      title: "Investimento e Pagamento",
      content: "",
      type: "pagamento",
      enabled: true,
      expanded: false,
      pageBreakBefore: false,
    },
    {
      id: "obrig_contratante",
      title: "Obrigações do Contratante",
      content:
        "- Fornecer todas as informações técnicas necessárias\n- Efetuar os pagamentos nas condições estabelecidas\n- Designar responsável para acompanhamento dos serviços\n- Informar previamente qualquer alteração de escopo",
      type: "text",
      enabled: true,
      expanded: false,
      pageBreakBefore: false,
    },
    {
      id: "obrig_contratada",
      title: "Obrigações da Contratada",
      content:
        "- Executar os serviços com qualidade técnica e dentro do prazo acordado\n- Designar profissional habilitado como responsável técnico\n- Emitir ART/RRT junto ao respectivo conselho de classe\n- Manter sigilo sobre informações confidenciais do CONTRATANTE",
      type: "text",
      enabled: true,
      expanded: false,
      pageBreakBefore: false,
    },
    {
      id: "vigencia",
      title: "Vigência da Proposta",
      content: "A presente proposta tem validade de 30 (trinta) dias corridos a partir da data de sua emissão.",
      type: "text",
      enabled: true,
      expanded: false,
      pageBreakBefore: false,
    },
    {
      id: "multas",
      title: "Multas, Inadimplemento e Rescisão",
      content:
        "O não pagamento nas datas acordadas ensejará multa de 2% sobre o valor em atraso, acrescida de juros de 1% ao mês. A rescisão antecipada por parte do CONTRATANTE implica o pagamento dos serviços já realizados, acrescidos de 20% a título de perdas e danos.",
      type: "text",
      enabled: true,
      expanded: false,
      pageBreakBefore: false,
    },
    {
      id: "foro",
      title: "Foro de Eleição",
      content: "As partes elegem o Foro da Comarca de Diadema - SP para dirimir quaisquer dúvidas ou litígios oriundos do presente instrumento.",
      type: "text",
      enabled: true,
      expanded: false,
      pageBreakBefore: false,
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

// ─── Editor Visual de Imagens ─────────────────────────────────────────────────

const CANVAS_W = 390;
const CANVAS_H = Math.round(CANVAS_W * 640 / 499); // ≈ 500 — proporção da área de conteúdo no PDF

interface DragState {
  slotIdx: number;
  action: "move" | "resize";
  startX: number;
  startY: number;
  startSlot: ImageSlot;
}

function ImagePageEditor({
  page,
  pageIdx,
  total,
  onUpdate,
  onDelete,
  onAddSlots,
}: {
  page: ImagePage;
  pageIdx: number;
  total: number;
  onUpdate: (pi: number, newPage: ImagePage) => void;
  onDelete: (pi: number) => void;
  onAddSlots: (pi: number, srcs: string[]) => void;
}) {
  const [selSlot, setSelSlot] = useState<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pageRef = useRef(page);
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { slotIdx, action, startX, startY, startSlot } = dragRef.current;
      const dx = (e.clientX - startX) / CANVAS_W * 100;
      const dy = (e.clientY - startY) / CANVAS_H * 100;
      const cur = pageRef.current;
      const newSlots = cur.slots.map((s, i) => {
        if (i !== slotIdx) return s;
        if (action === "move") {
          return { ...s, x: Math.max(0, Math.min(100 - startSlot.w, startSlot.x + dx)), y: Math.max(0, Math.min(100 - startSlot.h, startSlot.y + dy)) };
        }
        return { ...s, w: Math.max(8, Math.min(100 - startSlot.x, startSlot.w + dx)), h: Math.max(8, Math.min(100 - startSlot.y, startSlot.h + dy)) };
      });
      onUpdateRef.current(pageIdx, { ...cur, slots: newSlots });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [pageIdx]);

  const fileRef = useRef<HTMLInputElement>(null);
  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const srcs: string[] = new Array(files.length);
    let done = 0;
    files.forEach((f, fi) => {
      const r = new FileReader();
      r.onload = (ev) => {
        srcs[fi] = ev.target?.result as string;
        if (++done === files.length) onAddSlots(pageIdx, srcs);
      };
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">Página {pageIdx + 1} de {total}</span>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={addFiles} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F5A623] text-white rounded-lg hover:bg-[#d89016] transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Inserir imagem
          </button>
          <button onClick={() => onDelete(pageIdx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Excluir página">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Canvas WYSIWYG */}
      <div className="p-4 flex justify-center bg-gray-200">
        <div
          className="relative bg-white shadow-xl select-none overflow-hidden"
          style={{ width: CANVAS_W, height: CANVAS_H, cursor: "default" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelSlot(null); }}
        >
          {/* Grade de referência */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)", backgroundSize: "30px 30px" }} />

          {page.slots.map((slot, si) => {
            const l = slot.x / 100 * CANVAS_W;
            const t = slot.y / 100 * CANVAS_H;
            const w = slot.w / 100 * CANVAS_W;
            const h = slot.h / 100 * CANVAS_H;
            const isSel = selSlot === si;
            return (
              <div
                key={si}
                className={`absolute ${isSel ? "ring-2 ring-[#F5A623] ring-offset-0 z-10" : "ring-1 ring-gray-300 z-0 hover:ring-[#F5A623]/60"}`}
                style={{ left: l, top: t, width: w, height: h, cursor: "move" }}
                onClick={(e) => { e.stopPropagation(); setSelSlot(si); }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelSlot(si);
                  dragRef.current = { slotIdx: si, action: "move", startX: e.clientX, startY: e.clientY, startSlot: { ...slot } };
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slot.src} alt="" className="w-full h-full object-contain pointer-events-none" />
                {slot.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate pointer-events-none">{slot.caption}</div>
                )}
                {isSel && (
                  <>
                    {/* Botão excluir */}
                    <button
                      className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md z-20"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onUpdate(pageIdx, { ...pageRef.current, slots: pageRef.current.slots.filter((_, j) => j !== si) }); setSelSlot(null); }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    {/* Handle resize (canto inferior direito) */}
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-[#F5A623] rounded-sm cursor-se-resize shadow z-20"
                      onMouseDown={(e) => { e.stopPropagation(); dragRef.current = { slotIdx: si, action: "resize", startX: e.clientX, startY: e.clientY, startSlot: { ...slot } }; }}
                    />
                    {/* Handles resize nos outros cantos */}
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#F5A623]/70 rounded-sm z-20" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#F5A623]/70 rounded-sm z-20" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#F5A623]/70 rounded-sm z-20" />
                  </>
                )}
              </div>
            );
          })}

          {page.slots.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-sm gap-2 pointer-events-none">
              <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Clique em "Inserir imagem"
            </div>
          )}
        </div>
      </div>

      {/* Editor de legenda do slot selecionado */}
      {selSlot !== null && page.slots[selSlot] && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Legenda</label>
          <input
            type="text"
            value={page.slots[selSlot].caption}
            onChange={(e) => {
              const cur = pageRef.current;
              onUpdateRef.current(pageIdx, { ...cur, slots: cur.slots.map((s, i) => i === selSlot ? { ...s, caption: e.target.value } : s) });
            }}
            placeholder="Descrição opcional da imagem..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50"
          />
          <span className="text-xs text-gray-400 shrink-0">Imagem {selSlot + 1}</span>
        </div>
      )}
    </div>
  );
}

// ─── Editor Principal ─────────────────────────────────────────────────────────

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
  const [obraAddress, setObraAddress] = useState("");
  const [sectionSpacings, setSectionSpacings] = useState<Record<string, number>>({});
  const [imagePages, setImagePages] = useState<ImagePage[]>([]);
  const contacts: any[] = (client as any).contacts ?? [];
  // Contato selecionado para aparecer na proposta (null = dados do cliente principal)
  const primaryContact = contacts.find((c: any) => c.isPrimary) ?? null;
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    primaryContact?.id ?? null
  );
  const selectedContact = contacts.find((c: any) => c.id === selectedContactId) ?? null;
  const [tab, setTab] = useState<"secoes" | "pagamento" | "imagens">("secoes");
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
    obraAddress: obraAddress.trim() || undefined,
    sections: sections
      .filter((s) => s.enabled)
      .map(({ id, title, content, type, pageBreakBefore }) => ({
        id, title, content, type, pageBreakBefore,
        paddingBefore: sectionSpacings[id] ?? 0,
      })),
    valorTotal: proposal.totalValue,
    pagamentos,
    paymentNotes: paymentNotes.trim() || undefined,
    imagens: imagePages,
    bankInfo,
  }), [proposal, client, clientAddress, obraAddress, sections, pagamentos, paymentNotes, imagePages, bankInfo, selectedContact, sectionSpacings]);

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

  const handleSpacingChange = useCallback((id: string, v: number) =>
    setSectionSpacings(prev => ({ ...prev, [id]: v })), []);

  const handlePageUpdate = useCallback((pi: number, newPage: ImagePage) => {
    setImagePages(p => p.map((pg, i) => i === pi ? newPage : pg));
  }, []);

  const handlePageDelete = useCallback((pi: number) => {
    setImagePages(p => p.filter((_, i) => i !== pi));
  }, []);

  const handleAddSlots = useCallback((pi: number, srcs: string[]) => {
    setImagePages(p => p.map((pg, i) => {
      if (i !== pi) return pg;
      const offset = pg.slots.length * 5;
      const newSlots: ImageSlot[] = srcs.map((src, si) => ({
        src, caption: "",
        x: Math.min(offset + si * 5, 20),
        y: Math.min(offset + si * 5, 20),
        w: 60, h: 55,
      }));
      return { ...pg, slots: [...pg.slots, ...newSlots] };
    }));
  }, []);

  const totalPag = pagamentos.reduce((s, p) => s + p.valor, 0);
  const diff = Math.abs(totalPag - proposal.totalValue) > 0.5;
  const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  let counter = 0;

  const TABS = [
    { id: "secoes" as const, label: "Seções" },
    { id: "pagamento" as const, label: "Pagamento" },
    { id: "imagens" as const, label: "Imagens" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[98vw] my-2 flex flex-col overflow-hidden"
        style={{ height: "calc(100vh - 1rem)" }}
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

        {/* Split-view: Editor (esquerda) + Preview (direita) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Painel esquerdo: abas + conteúdo ── */}
          <div className="flex flex-col min-w-0 min-h-0 border-r border-gray-200" style={{ width: "420px", flexShrink: 0 }}>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-4 bg-gray-50 shrink-0 overflow-x-auto">
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
                  {t.id === "imagens" && imagePages.length > 0 && (
                    <span className="ml-1.5 text-xs bg-[#F5A623] text-white rounded-full px-1.5 py-0.5">
                      {imagePages.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">

          {/* Secoes */}
          {tab === "secoes" && (
            <div className="p-6 space-y-2">
              {/* Endereço da Obra */}
              <div className="mb-5 p-4 rounded-xl border border-[#F5A623]/40 bg-[#F5A623]/5">
                <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                  Endereço / Local da Obra
                </label>
                <input
                  type="text"
                  value={obraAddress}
                  onChange={(e) => setObraAddress(e.target.value)}
                  placeholder="Ex: Rua das Flores, 123 — São Paulo - SP"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50"
                />
                <p className="mt-1 text-xs text-gray-400">Aparece no PDF logo antes da seção Objetivo do Contrato.</p>
              </div>
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
                      {/* Quebra de página antes desta seção */}
                      <button
                        onClick={() => updateSec(sec.id, "pageBreakBefore", !sec.pageBreakBefore)}
                        title={sec.pageBreakBefore ? "Remover quebra de página" : "Iniciar em nova página"}
                        className={"p-1 rounded transition-colors shrink-0 " + (sec.pageBreakBefore ? "text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/20" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="3 2" />
                        </svg>
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
                    {sec.pageBreakBefore && sec.enabled && (
                      <div className="mx-4 -mt-1 mb-1 flex items-center gap-1.5 text-[10px] text-[#F5A623] font-semibold">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /></svg>
                        Inicia em nova página
                      </div>
                    )}
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
                      pageBreakBefore: false,
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

              {/* Condições de Pagamento */}
              <div className="mt-6 pt-5 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Condições de Pagamento</h3>
                <p className="text-xs text-gray-500 mb-2">
                  Aparece em destaque <strong>antes</strong> das parcelas (ex: sinal, vencimentos, multa por atraso). Deixe em branco para não exibir.
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
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Arraste imagens para posicionar · canto <span className="font-semibold text-[#F5A623]">■</span> para redimensionar · clique para selecionar e editar legenda.</p>
                <button
                  onClick={() => setImagePages(p => [...p, { id: "pg_" + Date.now(), slots: [] }])}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#333] transition shrink-0 ml-4"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Nova página
                </button>
              </div>
              {imagePages.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
                  Crie uma página e insira imagens para compor o PDF.
                </div>
              ) : (
                imagePages.map((page, pi) => (
                  <ImagePageEditor
                    key={page.id}
                    page={page}
                    pageIdx={pi}
                    total={imagePages.length}
                    onUpdate={handlePageUpdate}
                    onDelete={handlePageDelete}
                    onAddSlots={handleAddSlots}
                  />
                ))
              )}
            </div>
          )}


            </div>{/* fim flex-1 overflow-auto */}
          </div>{/* fim painel esquerdo */}

          {/* ── Painel direito: canvas interativo de diagramação ── */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden" style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <InteractivePDFCanvas
                sections={sections}
                sectionSpacings={sectionSpacings}
                onSpacingChange={handleSpacingChange}
              />
            </div>
          </div>

        </div>{/* fim split-view */}
      </div>
    </div>
  );
}
