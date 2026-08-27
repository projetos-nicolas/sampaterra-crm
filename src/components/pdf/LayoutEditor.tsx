"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PAGE_W,
  makeText,
  makeImage,
  makeRect,
  type ProposalLayout,
  type LayoutElement,
} from "@/lib/pdf/layout";
import { useLayoutEditor } from "./useLayoutEditor";
import { PageCanvas } from "./PageCanvas";
import { LayoutInspector } from "./LayoutInspector";
import { LayerList } from "./LayerList";
import { usePdfPages } from "./usePdfPages";
import { AUTO_BLOCK_DEFS, sectionBlockDef, type AutoBlockDef } from "./autoBlocks";

/**
 * Editor da proposta — a folha real do PDF ao fundo, camada livre por cima.
 *
 * As folhas vêm de `usePdfPages`, que gera o PDF e rasteriza cada página.
 * Assim o usuário vê quantas folhas existem de verdade (incluindo as que o
 * escopo criou) e edita sobre o documento, não sobre uma aproximação.
 */
export function LayoutEditor({
  pdfData,
  initialLayout,
  sections,
  imageOptions,
  heroSrc,
  onChange,
  onSave,
  saving,
}: {
  pdfData: any;
  initialLayout?: ProposalLayout | null;
  sections: { id: string; title: string; content: string }[];
  imageOptions: { label: string; src: string }[];
  heroSrc?: string;
  onChange?: (l: ProposalLayout) => void;
  onSave: (l: ProposalLayout) => void;
  saving?: boolean;
}) {
  const ed = useLayoutEditor(initialLayout);
  const [pageIndex, setPageIndex] = useState(1);
  const [zoom, setZoom] = useState(0.68);
  const [showLayers, setShowLayers] = useState(true);

  const { pages, rendering, erro } = usePdfPages(pdfData, true);
  const total = pages.length || 1;

  useEffect(() => { onChange?.(ed.layout); }, [ed.layout, onChange]);
  // Se o documento encolheu, não deixa a folha aberta apontar para o vazio
  useEffect(() => {
    if (pages.length && pageIndex > pages.length) setPageIndex(pages.length);
  }, [pages.length, pageIndex]);

  const autoBlocks: AutoBlockDef[] = useMemo(
    () => [...AUTO_BLOCK_DEFS, ...sections.map((s, i) => sectionBlockDef(s, i))],
    [sections]
  );

  const daFolha = ed.layout.elements.filter((e) => e.pageIndex === pageIndex);
  const atual = ed.layout.elements.find((e) => ed.selected.includes(e.id)) ?? null;
  const folhaAtual = pages.find((p) => p.index === pageIndex);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const t = ev.target as HTMLElement;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea" || t?.isContentEditable) return;

      const sel = ed.selected;
      if (!sel.length) return;
      const step = ev.shiftKey ? 10 : 1;

      if (ev.key.startsWith("Arrow")) {
        ev.preventDefault();
        ed.commit();
        ed.patchMany(sel, (e) => ({
          x: e.x + (ev.key === "ArrowRight" ? step : ev.key === "ArrowLeft" ? -step : 0),
          y: e.y + (ev.key === "ArrowDown" ? step : ev.key === "ArrowUp" ? -step : 0),
        }));
      }
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault(); ed.commit(); ed.remove(sel);
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        const e = ed.layout.elements.find((x) => x.id === sel[0]);
        if (e) {
          ed.commit();
          ed.add({
            ...JSON.parse(JSON.stringify(e)),
            id: "el_" + Math.random().toString(36).slice(2, 10),
            x: e.x + 12, y: e.y + 12,
            name: e.name + " (cópia)", sourceId: undefined,
          });
        }
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        ev.shiftKey ? ed.redo() : ed.undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ed]);

  const btn =
    "px-2.5 py-1.5 rounded-md text-[12px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Ferramentas */}
      <div className="flex items-center gap-1 flex-wrap px-2.5 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <button className={btn} onClick={ed.undo} disabled={!ed.canUndo}>Desfazer</button>
        <button className={btn} onClick={ed.redo} disabled={!ed.canRedo}>Refazer</button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button className={btn} onClick={() => { ed.commit(); ed.add(makeText(pageIndex, { y: 300 })); }}>
          + Texto
        </button>
        <button
          className={btn}
          onClick={() => {
            ed.commit();
            ed.add(makeText(pageIndex, {
              name: "Frase em destaque", y: 340, h: 34,
              text: "Prazo de execução: 45 dias", size: 12, weight: 700, highlight: "bar",
            }));
          }}
        >
          + Destaque
        </button>
        <button
          className={btn}
          disabled={!imageOptions.length}
          onClick={() => { ed.commit(); ed.add(makeImage(pageIndex, imageOptions[0]?.src ?? "", { y: 380 })); }}
        >
          + Foto
        </button>
        <button className={btn} onClick={() => { ed.commit(); ed.add(makeRect(pageIndex, { y: 430 })); }}>
          + Forma
        </button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button className={btn} onClick={() => setZoom((z) => Math.max(0.25, z - 0.08))}>−</button>
        <span className="text-[12px] font-mono text-gray-500 w-11 text-center">{Math.round(zoom * 100)}%</span>
        <button className={btn} onClick={() => setZoom((z) => Math.min(1.5, z + 0.08))}>+</button>
        <button className={btn} onClick={() => setShowLayers((v) => !v)}>
          {showLayers ? "Ocultar camadas" : "Camadas"}
        </button>

        <span className="flex-1" />

        {rendering && (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400 mr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
            atualizando folhas
          </span>
        )}
        <button
          className={btn}
          onClick={() => {
            if (confirm(`Descartar tudo que você posicionou na folha ${pageIndex}?`)) {
              ed.commit();
              ed.resetPageIndex(pageIndex);
            }
          }}
        >
          Restaurar folha
        </button>
        <button
          onClick={() => onSave(ed.layout)}
          disabled={saving}
          className="px-3.5 py-1.5 rounded-md bg-[#1A1A1A] text-white text-[12px] font-semibold hover:bg-[#2C2C2C] disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar diagramação"}
        </button>
      </div>

      {erro && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-200 text-[12px] text-red-700 shrink-0">
          Não consegui desenhar as folhas: {erro}
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {/* Miniaturas — todas as folhas do documento */}
        <aside className="w-[126px] shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto py-3">
          {pages.length === 0 ? (
            <p className="px-3 text-[11px] text-gray-400 text-center leading-relaxed">
              Desenhando as folhas…
            </p>
          ) : (
            pages.map((p) => {
              const n = ed.layout.elements.filter((e) => e.pageIndex === p.index).length;
              const on = p.index === pageIndex;
              return (
                <button
                  key={p.index}
                  onClick={() => { setPageIndex(p.index); ed.setSelected([]); }}
                  className="block w-full px-3 pb-3 text-left group"
                >
                  <div
                    className={`relative rounded-sm overflow-hidden border-2 transition ${
                      on ? "border-[#F5A623] shadow-md" : "border-gray-200 group-hover:border-gray-400"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.dataUrl} alt="" className="w-full block" />
                    {n > 0 && (
                      <span className="absolute top-1 right-1 bg-[#F5A623] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {n}
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] mt-1 text-center font-semibold ${on ? "text-[#1A1A1A]" : "text-gray-400"}`}>
                    {p.index}
                  </p>
                </button>
              );
            })
          )}
        </aside>

        {/* Camadas */}
        {showLayers && (
          <aside className="w-[186px] shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <LayerList
              layout={ed.layout}
              elements={daFolha}
              autoBlocks={autoBlocks}
              selected={ed.selected}
              onSelect={ed.setSelected}
              onDetach={(def) => { ed.commit(); ed.detach(def.id, def.make({ pageIndex, heroSrc })); }}
              onReattach={(id) => { ed.commit(); ed.reattach(id); }}
              onToggleLock={(id) => {
                const e = ed.layout.elements.find((x) => x.id === id);
                if (e) { ed.commit(); ed.patch(id, { locked: !e.locked }); }
              }}
              onDetachAll={() => {
                ed.commit();
                for (const b of autoBlocks.filter((b) => !ed.layout.detached.includes(b.id))) {
                  ed.detach(b.id, b.make({ pageIndex, heroSrc }));
                }
              }}
            />
          </aside>
        )}

        {/* Folha */}
        <div className="flex-1 min-w-0 overflow-auto bg-gray-200/70 p-6 flex justify-center items-start">
          <div style={{ width: PAGE_W * zoom }}>
            <PageCanvas
              elements={daFolha}
              selected={ed.selected}
              zoom={zoom}
              backgroundUrl={folhaAtual?.dataUrl}
              stale={rendering}
              onSelect={ed.setSelected}
              onCommit={ed.commit}
              onPatch={ed.patch}
              onEditText={(id, text) => ed.patch(id, { text } as Partial<LayoutElement>)}
            />
          </div>
        </div>

        {/* Propriedades */}
        <aside className="w-[222px] shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
          <LayoutInspector
            element={atual}
            imageOptions={imageOptions}
            totalPages={total}
            onCommit={ed.commit}
            onPatch={(d) => atual && ed.patch(atual.id, d)}
            onRemove={() => atual && ed.remove([atual.id])}
            onReorder={(to) => atual && ed.reorder(atual.id, to)}
            onReattach={(id) => { ed.commit(); ed.reattach(id); }}
          />
        </aside>
      </div>
    </div>
  );
}
