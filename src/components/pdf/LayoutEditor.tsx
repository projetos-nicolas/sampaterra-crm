"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PAGE_W,
  makeText,
  makeImage,
  makeRect,
  type LayerPageKind,
  type ProposalLayout,
  type LayoutElement,
} from "@/lib/pdf/layout";
import { useLayoutEditor } from "./useLayoutEditor";
import { PageCanvas } from "./PageCanvas";
import { LayoutInspector } from "./LayoutInspector";
import { LayerList } from "./LayerList";
import { AUTO_BLOCK_DEFS, sectionBlockDef, type AutoBlockDef } from "./autoBlocks";

const PAGES: { id: LayerPageKind; label: string }[] = [
  { id: "capa", label: "Capa" },
  { id: "institucional", label: "Institucional" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "imagens", label: "Imagens" },
  { id: "assinatura", label: "Assinatura" },
];

/**
 * Editor da camada livre — o "Canva" da proposta.
 *
 * Trabalha sobre UMA folha por vez (o seletor no topo troca), mas o estado é
 * o layout inteiro: por isso mover um elemento de folha é só trocar o campo
 * `page` dele no inspetor, sem recortar e colar nada.
 */
export function LayoutEditor({
  initialLayout,
  sections,
  imageOptions,
  heroSrc,
  onChange,
  onSave,
  saving,
}: {
  initialLayout?: ProposalLayout | null;
  sections: { id: string; title: string; content: string }[];
  imageOptions: { label: string; src: string }[];
  heroSrc?: string;
  onChange?: (l: ProposalLayout) => void;
  onSave: (l: ProposalLayout) => void;
  saving?: boolean;
}) {
  const ed = useLayoutEditor(initialLayout);
  const [page, setPage] = useState<LayerPageKind>("institucional");
  const [zoom, setZoom] = useState(0.62);

  useEffect(() => { onChange?.(ed.layout); }, [ed.layout, onChange]);

  const autoBlocks: AutoBlockDef[] = useMemo(
    () => [...AUTO_BLOCK_DEFS, ...sections.map((s, i) => sectionBlockDef(s, i))],
    [sections]
  );

  const daPagina = ed.layout.elements.filter((e) => e.page === page);
  const atual = ed.layout.elements.find((e) => ed.selected.includes(e.id)) ?? null;

  // Atalhos: só quando o foco não está num campo de formulário
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const tag = (ev.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if ((ev.target as HTMLElement)?.isContentEditable) return;

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
        ev.preventDefault();
        ed.commit();
        ed.remove(sel);
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        const e = ed.layout.elements.find((x) => x.id === sel[0]);
        if (e) {
          ed.commit();
          ed.add({ ...JSON.parse(JSON.stringify(e)), id: "el_" + Math.random().toString(36).slice(2, 10), x: e.x + 12, y: e.y + 12, name: e.name + " (cópia)", sourceId: undefined });
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

  const btn = "px-2.5 py-1.5 rounded-md text-[12px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Barra de ferramentas */}
      <div className="flex items-center gap-1 flex-wrap px-2.5 py-2 border-b border-gray-200 bg-gray-50">
        <button className={btn} onClick={ed.undo} disabled={!ed.canUndo}>Desfazer</button>
        <button className={btn} onClick={ed.redo} disabled={!ed.canRedo}>Refazer</button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button className={btn} onClick={() => { ed.commit(); ed.add(makeText(page, { y: 300 })); }}>+ Texto</button>
        <button
          className={btn}
          onClick={() => {
            ed.commit();
            ed.add(makeText(page, {
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
          onClick={() => { ed.commit(); ed.add(makeImage(page, imageOptions[0]?.src ?? "", { y: 380 })); }}
        >
          + Foto
        </button>
        <button className={btn} onClick={() => { ed.commit(); ed.add(makeRect(page, { y: 430 })); }}>+ Forma</button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button className={btn} onClick={() => setZoom((z) => Math.max(0.3, z - 0.08))}>−</button>
        <span className="text-[12px] font-mono text-gray-500 w-11 text-center">{Math.round(zoom * 100)}%</span>
        <button className={btn} onClick={() => setZoom((z) => Math.min(1.4, z + 0.08))}>+</button>
        <span className="flex-1" />
        <button
          className={btn}
          onClick={() => { if (confirm(`Descartar a diagramação da folha ${PAGES.find(p=>p.id===page)?.label}?`)) { ed.commit(); ed.resetPage(page); } }}
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

      {/* Seletor de folha */}
      <div className="flex gap-1 px-2.5 py-1.5 border-b border-gray-200 bg-white overflow-x-auto">
        {PAGES.map((p) => {
          const n = ed.layout.elements.filter((e) => e.page === p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => { setPage(p.id); ed.setSelected([]); }}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold whitespace-nowrap transition ${
                page === p.id ? "bg-[#1A1A1A] text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {p.label}
              {n > 0 && (
                <span className={`ml-1.5 text-[10px] ${page === p.id ? "text-white/60" : "text-[#F5A623]"}`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Três colunas */}
      <div className="flex-1 min-h-0 grid grid-cols-[190px_minmax(0,1fr)_226px]">
        <aside className="border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <LayerList
            page={page}
            layout={ed.layout}
            elements={daPagina}
            autoBlocks={autoBlocks}
            selected={ed.selected}
            onSelect={ed.setSelected}
            onDetach={(def) => { ed.commit(); ed.detach(def.id, def.make({ heroSrc })); }}
            onReattach={(id) => { ed.commit(); ed.reattach(id); }}
            onToggleLock={(id) => {
              const e = ed.layout.elements.find((x) => x.id === id);
              if (e) { ed.commit(); ed.patch(id, { locked: !e.locked }); }
            }}
            onDetachAll={() => {
              ed.commit();
              for (const b of autoBlocks.filter((b) => b.page === page && !ed.layout.detached.includes(b.id))) {
                ed.detach(b.id, b.make({ heroSrc }));
              }
            }}
          />
        </aside>

        <div className="overflow-auto bg-gray-100 p-6 flex justify-center items-start">
          <div style={{ width: PAGE_W * zoom }}>
            <PageCanvas
              elements={daPagina}
              selected={ed.selected}
              zoom={zoom}
              onSelect={ed.setSelected}
              onCommit={ed.commit}
              onPatch={ed.patch}
              onEditText={(id, text) => ed.patch(id, { text } as Partial<LayoutElement>)}
            />
          </div>
        </div>

        <aside className="border-l border-gray-200 bg-gray-50 overflow-y-auto">
          <LayoutInspector
            element={atual}
            imageOptions={imageOptions}
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
