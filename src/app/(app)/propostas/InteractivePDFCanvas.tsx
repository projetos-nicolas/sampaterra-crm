"use client";

/**
 * Canvas HTML interativo que simula o layout do PDF.
 * Permite arrastar handles entre seções para ajustar o espaçamento (paddingBefore).
 * Os valores ajustados são passados ao PropostaPDF para geração do arquivo final.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import type { PDFSection, PagamentoItem } from "@/lib/pdf/PropostaPDF";

// ── Geometria A4 em pontos (mesma do PropostaPDF) ───────────────────────────
const A4_W = 595;
const A4_H = 842;
const MARGIN_L = 72;
const MARGIN_R = 48;
const MARGIN_T = 52;
const MARGIN_B = 60;
const CONTENT_W = A4_W - MARGIN_L - MARGIN_R; // 475pt

// ── Estimativa de altura por seção (heurística) ─────────────────────────────
function estimateSectionHeight(section: PDFSection): number {
  const titleH = 20; // título em caps
  if (section.type === "pagamento") return titleH + 120;
  const lines = section.content.split("\n").filter(Boolean);
  const lineH = 13;
  const linesRendered = lines.reduce((acc, l) => acc + Math.ceil((l.length * 5.5) / CONTENT_W) || 1, 0);
  return titleH + Math.max(1, linesRendered) * lineH;
}

// ── Cores da marca ───────────────────────────────────────────────────────────
const TEAL = "#0D4A47";
const ORANGE = "#E8571A";

// ── Componente de seção simulada ─────────────────────────────────────────────
function SectionPreview({
  section,
  number,
  scale,
}: {
  section: PDFSection;
  number: number;
  scale: number;
}) {
  const px = (pt: number) => pt * scale;
  const lines = section.content.split("\n").filter(Boolean);

  return (
    <div style={{ marginBottom: px(14) }}>
      {/* Header da seção */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: px(6), marginBottom: px(5) }}>
        <span
          style={{
            color: ORANGE,
            fontWeight: 700,
            fontSize: px(12),
            fontFamily: "serif",
            lineHeight: 1,
            minWidth: px(18),
          }}
        >
          {number}.
        </span>
        <span
          style={{
            color: TEAL,
            fontWeight: 700,
            fontSize: px(8.5),
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: "sans-serif",
            lineHeight: 1.3,
          }}
        >
          {section.title}
        </span>
      </div>

      {/* Conteúdo */}
      {section.type === "pagamento" ? (
        <div
          style={{
            marginLeft: px(24),
            padding: px(8),
            background: "#f9fafb",
            border: "1px dashed #d1d5db",
            borderRadius: px(3),
            fontSize: px(7.5),
            color: "#6b7280",
            fontFamily: "sans-serif",
          }}
        >
          Tabela de Investimento e Pagamento
        </div>
      ) : (
        <div style={{ marginLeft: px(24) }}>
          {lines.map((line, i) => {
            const isBullet = line.startsWith("-") || line.startsWith("*");
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: px(4),
                  marginBottom: px(2.5),
                  fontSize: px(7.5),
                  color: "#374151",
                  fontFamily: "sans-serif",
                  lineHeight: 1.45,
                }}
              >
                {isBullet && (
                  <span style={{ color: ORANGE, flexShrink: 0, marginTop: 1 }}>•</span>
                )}
                <span>{isBullet ? line.replace(/^[-*]\s*/, "") : line}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Handle de espaçamento arrastável ─────────────────────────────────────────
function SpacingHandle({
  sectionId,
  spacing,
  onChange,
  scale,
}: {
  sectionId: string;
  spacing: number;
  onChange: (v: number) => void;
  scale: number;
}) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null);
  const [active, setActive] = useState(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dy = e.clientY - dragRef.current.startY;
      const dpt = dy / scale;
      const next = Math.max(0, Math.min(120, Math.round(dragRef.current.startVal + dpt)));
      onChangeRef.current(next);
    };
    const onUp = () => { dragRef.current = null; setActive(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [scale]);

  const px = (pt: number) => pt * scale;
  const handleH = Math.max(16, px(spacing) + 16);

  return (
    <div
      style={{
        height: handleH,
        position: "relative",
        cursor: "ns-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        dragRef.current = { startY: e.clientY, startVal: spacing };
        setActive(true);
      }}
    >
      {/* Faixa de espaço com linhas pontilhadas */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderTop: `1px dashed ${active ? ORANGE : "#d1d5db"}`,
          borderBottom: `1px dashed ${active ? ORANGE : "#d1d5db"}`,
          background: active ? "rgba(232,87,26,0.04)" : "rgba(0,0,0,0.01)",
          transition: "background 0.1s",
        }}
      />
      {/* Badge */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: active ? ORANGE : "#e5e7eb",
          color: active ? "white" : "#6b7280",
          fontSize: 10,
          fontFamily: "sans-serif",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 99,
          display: "flex",
          alignItems: "center",
          gap: 4,
          boxShadow: active ? "0 2px 8px rgba(232,87,26,0.3)" : "none",
          transition: "all 0.1s",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" />
        </svg>
        {spacing}pt
      </div>
    </div>
  );
}

// ── Indicador de quebra de página ────────────────────────────────────────────
function PageBreakLine({ scale }: { scale: number }) {
  const px = (pt: number) => pt * scale;
  return (
    <div style={{ position: "relative", margin: `${px(4)}px 0`, display: "flex", alignItems: "center", gap: px(6) }}>
      <div style={{ flex: 1, height: 1, background: "#93c5fd", borderTop: "1.5px dashed #3b82f6" }} />
      <span style={{ fontSize: 9, color: "#3b82f6", fontFamily: "sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>
        — nova página —
      </span>
      <div style={{ flex: 1, height: 1, background: "#93c5fd", borderTop: "1.5px dashed #3b82f6" }} />
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
interface Props {
  sections: Array<PDFSection & { enabled: boolean }>;
  sectionSpacings: Record<string, number>;
  onSpacingChange: (id: string, spacing: number) => void;
}

export function InteractivePDFCanvas({ sections, sectionSpacings, onSpacingChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.65);

  // Ajusta a escala ao tamanho do container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const availW = entry.contentRect.width - 40; // padding
        setScale(Math.min(0.85, Math.max(0.4, availW / A4_W)));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const px = (pt: number) => pt * scale;
  const enabledSections = sections.filter((s) => s.enabled);

  // Simula quebras de página: acumula altura e marca onde cada página começa
  let sectionNum = 0;
  let accH = 0;
  const contentH = A4_H - MARGIN_T - MARGIN_B;
  const items: Array<{ section: PDFSection; num: number; pageBreak: boolean }> = [];

  for (const sec of enabledSections) {
    const spacing = sectionSpacings[sec.id] ?? 0;
    const h = estimateSectionHeight(sec) + spacing;
    const pageBreak = sec.pageBreakBefore || accH + h > contentH;
    if (pageBreak) accH = 0;
    accH += h;
    items.push({ section: sec, num: ++sectionNum, pageBreak });
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        background: "#525659",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 10px",
        gap: 16,
      }}
    >
      {/* Instrução */}
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.6)",
          fontFamily: "sans-serif",
          textAlign: "center",
          marginBottom: 4,
          userSelect: "none",
        }}
      >
        Arraste os handles <strong style={{ color: ORANGE }}>↕ Npt</strong> entre seções para ajustar o espaçamento
      </div>

      {/* Folha A4 */}
      <div
        style={{
          width: px(A4_W),
          minHeight: px(A4_H),
          background: "white",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          borderRadius: 2,
          padding: `${px(MARGIN_T)}px ${px(MARGIN_R)}px ${px(MARGIN_B)}px ${px(MARGIN_L)}px`,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Cabeçalho simulado */}
        <div
          style={{
            borderBottom: `${px(1.5)}px solid ${TEAL}`,
            marginBottom: px(18),
            paddingBottom: px(6),
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <span style={{ fontSize: px(7), color: TEAL, fontFamily: "sans-serif", fontWeight: 700 }}>
            SAMPA TERRA — TERRAPLANAGEM E DEMOLIÇÃO
          </span>
          <span style={{ fontSize: px(6), color: "#999", fontFamily: "sans-serif" }}>
            PROPOSTA TÉCNICA
          </span>
        </div>

        {items.map(({ section, num, pageBreak }, idx) => {
          const spacing = sectionSpacings[section.id] ?? 0;
          return (
            <div key={section.id}>
              {/* Indicador de quebra de página */}
              {pageBreak && idx > 0 && <PageBreakLine scale={scale} />}

              {/* Handle de espaçamento (exceto na primeira seção) */}
              {idx > 0 && !pageBreak && (
                <SpacingHandle
                  sectionId={section.id}
                  spacing={spacing}
                  onChange={(v) => onSpacingChange(section.id, v)}
                  scale={scale}
                />
              )}

              {/* Handle após quebra de página (permite espaço no início da nova página) */}
              {pageBreak && idx > 0 && (
                <SpacingHandle
                  sectionId={section.id}
                  spacing={spacing}
                  onChange={(v) => onSpacingChange(section.id, v)}
                  scale={scale}
                />
              )}

              <SectionPreview section={section} number={num} scale={scale} />
            </div>
          );
        })}

        {enabledSections.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#9ca3af",
              fontFamily: "sans-serif",
              fontSize: px(9),
              marginTop: px(40),
            }}
          >
            Ative seções no painel esquerdo para visualizar
          </div>
        )}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
