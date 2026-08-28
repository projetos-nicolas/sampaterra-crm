"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  makeText,
  makeImage,
  makeRect,
  type ProposalLayout,
  type LayoutElement,
} from "@/lib/pdf/layout";
import { useLayoutEditor } from "./useLayoutEditor";
import { PageCanvas } from "./PageCanvas";
import { CanvasViewport } from "./CanvasViewport";
import { LayoutInspector } from "./LayoutInspector";
import { usePdfPages } from "./usePdfPages";
import { AUTO_BLOCK_DEFS, sectionBlockDef, type AutoBlockDef, type DocPart } from "./autoBlocks";
import { aplicarRecorte } from "./clipImage";
import type { ClipKind, ImageElement } from "@/lib/pdf/layout";

/** Reduz a foto antes de embutir: uma câmera de celular geraria 5 MB de JSON. */
async function prepararImagem(file: File, maxLado = 1400): Promise<string> {
  const dataUrl: string = await new Promise((ok, err) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.onerror = () => err(new Error("Não consegui ler o arquivo."));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((ok, err) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => err(new Error("Arquivo de imagem inválido."));
    i.src = dataUrl;
  });
  const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
  if (escala === 1 && dataUrl.length < 400_000) return dataUrl;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * escala);
  c.height = Math.round(img.height * escala);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export function LayoutEditor({
  pdfDataBase,
  initialLayout,
  sections,
  imageOptions,
  heroSrc,
  onChange,
  onSave,
  saving,
}: {
  pdfDataBase: any;
  initialLayout?: ProposalLayout | null;
  sections: { id: string; title: string; content: string }[];
  imageOptions: { label: string; src: string }[];
  heroSrc?: string;
  onChange?: (l: ProposalLayout) => void;
  onSave: (l: ProposalLayout) => void | Promise<void>;
  saving?: boolean;
}) {
  const ed = useLayoutEditor(initialLayout);
  const [pageIndex, setPageIndex] = useState(1);
  const [zoom, setZoom] = useState(0.6);
  const [erroUpload, setErroUpload] = useState("");
  const [estadoSave, setEstadoSave] = useState<"limpo" | "pendente" | "salvando" | "salvo">("limpo");
  const fitRef = useRef<null | (() => void)>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const detachedKey = ed.layout.detached.join("|");
  const bgData = useMemo(
    () => ({ ...pdfDataBase, layout: { v: 1 as const, elements: [], detached: ed.layout.detached } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pdfDataBase, detachedKey]
  );
  const { pages, rendering, erro } = usePdfPages(bgData, true);

  useEffect(() => { onChange?.(ed.layout); }, [ed.layout, onChange]);
  useEffect(() => {
    if (pages.length && pageIndex > pages.length) setPageIndex(pages.length);
  }, [pages.length, pageIndex]);

  // ── Salva sozinho ─────────────────────────────────────────────────────────
  // O usuário não deve precisar lembrar de um botão: sair da tela sem clicar
  // em "salvar" era o motivo de as edições sumirem.
  const primeiroRender = useRef(true);
  useEffect(() => {
    if (primeiroRender.current) { primeiroRender.current = false; return; }
    setEstadoSave("pendente");
    const t = setTimeout(async () => {
      setEstadoSave("salvando");
      try {
        await onSave(ed.layout);
        setEstadoSave("salvo");
      } catch {
        setEstadoSave("pendente");
      }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ed.layout]);

  const autoBlocks: AutoBlockDef[] = useMemo(
    () => [...AUTO_BLOCK_DEFS, ...sections.map((s, i) => sectionBlockDef(s, i))],
    [sections]
  );

  /** Em que folha física vive cada parte do documento. */
  const partes = useMemo(() => {
    const total = pages.length || 1;
    const nImagens = Array.isArray(pdfDataBase?.imagens) ? pdfDataBase.imagens.length : 0;
    const assinatura = total;
    const primeiraImagem = Math.max(3, assinatura - nImagens);
    const mapa: Record<DocPart, number> = {
      capa: 1,
      institucional: Math.min(2, total),
      conteudo: Math.min(3, total),
      assinatura,
    };
    return { mapa, conteudoAte: Math.max(3, primeiraImagem - 1) };
  }, [pages.length, pdfDataBase?.imagens]);

  // ── Torna a folha editável assim que ela é aberta ─────────────────────────
  // Sem botão de "soltar": o usuário abre a folha e os campos já respondem.
  useEffect(() => {
    if (!pages.length) return;
    if (ed.layout.materialized?.includes(pageIndex)) return;
    const daFolha = autoBlocks.filter((b) =>
      b.part === "conteudo"
        ? pageIndex >= partes.mapa.conteudo && pageIndex <= partes.conteudoAte
        : partes.mapa[b.part] === pageIndex
    );
    ed.materializePage(
      pageIndex,
      daFolha.map((b, i) => ({ id: b.id, el: b.make({ pageIndex, offsetIndex: i, heroSrc }) }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pages.length, autoBlocks, partes]);

  /**
   * Recorta as imagens que nasceram do template pedindo hexágono ou círculo.
   * A foto original é retangular; o recorte é gravado nela uma única vez.
   */
  const recortando = useRef(new Set<string>());
  useEffect(() => {
    const pendentes = ed.layout.elements.filter(
      (e): e is ImageElement =>
        e.kind === "image" && e.clip !== "none" && !e.srcOriginal && !recortando.current.has(e.id)
    );
    if (!pendentes.length) return;
    pendentes.forEach((el) => {
      recortando.current.add(el.id);
      void aplicarRecorte(el.src, el.clip, el.w, el.h)
        .then((nova) => ed.patch(el.id, { src: nova, srcOriginal: el.src } as Partial<LayoutElement>))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ed.layout.elements]);

  const daFolha = ed.layout.elements.filter((e) => e.pageIndex === pageIndex);
  const atual = ed.layout.elements.find((e) => ed.selected.includes(e.id)) ?? null;
  const folhaAtual = pages.find((p) => p.index === pageIndex);

  // ── Inserir imagem do computador ──────────────────────────────────────────
  const inserirArquivos = useCallback(
    async (files: FileList | File[]) => {
      setErroUpload("");
      const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!lista.length) return;
      try {
        const prontas = await Promise.all(lista.map((f) => prepararImagem(f)));
        ed.commit();
        prontas.forEach((src, i) =>
          ed.add(
            makeImage(pageIndex, src, {
              name: lista[i].name.replace(/\.[^.]+$/, "").slice(0, 28),
              x: 60 + i * 16,
              y: 300 + i * 16,
              w: 180,
              h: 180,
            })
          )
        );
      } catch (e: any) {
        setErroUpload(e?.message ?? "Não consegui inserir a imagem.");
      }
    },
    [ed, pageIndex]
  );

  /**
   * Troca o recorte de uma imagem. O recorte é gravado na própria imagem
   * (ver clipImage.ts), então trocar significa recortar de novo a partir do
   * original — por isso `srcOriginal` é preservado.
   */
  const trocarRecorte = useCallback(
    async (el: ImageElement, clip: ClipKind) => {
      const base = el.srcOriginal ?? el.src;
      try {
        const nova = await aplicarRecorte(base, clip, el.w, el.h);
        ed.commit();
        ed.patch(el.id, { clip, src: nova, srcOriginal: base } as Partial<LayoutElement>);
      } catch (e: any) {
        setErroUpload(e?.message ?? "Não consegui aplicar o recorte.");
      }
    },
    [ed]
  );

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
      if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); ed.commit(); ed.remove(sel); }
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
  const statusTexto =
    estadoSave === "salvando" ? "salvando…"
    : estadoSave === "pendente" ? "alterações não salvas"
    : estadoSave === "salvo" ? "tudo salvo"
    : "";

  return (
    <div
      className="flex flex-col h-full min-h-0 bg-white"
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) void inserirArquivos(e.dataTransfer.files); }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) void inserirArquivos(e.target.files); e.target.value = ""; }}
      />

      <div className="flex items-center gap-1 flex-wrap px-2.5 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <button className={btn} onClick={ed.undo} disabled={!ed.canUndo}>Desfazer</button>
        <button className={btn} onClick={ed.redo} disabled={!ed.canRedo}>Refazer</button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button className={btn} onClick={() => { ed.commit(); ed.add(makeText(pageIndex, { y: 300 })); }}>+ Texto</button>
        <button
          className={btn}
          onClick={() => {
            ed.commit();
            ed.add(makeText(pageIndex, { name: "Frase em destaque", y: 340, h: 34, text: "Prazo de execução: 45 dias", size: 12, weight: 700, highlight: "bar" }));
          }}
        >
          + Destaque
        </button>
        <button className={btn} onClick={() => fileRef.current?.click()}>+ Imagem do computador</button>
        <button className={btn} onClick={() => { ed.commit(); ed.add(makeRect(pageIndex, { y: 430 })); }}>+ Forma</button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button className={btn} onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}>−</button>
        <span className="text-[12px] font-mono text-gray-500 w-11 text-center">{Math.round(zoom * 100)}%</span>
        <button className={btn} onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>+</button>
        <button className={btn} onClick={() => fitRef.current?.()}>Ajustar</button>

        <span className="flex-1" />

        {rendering && (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400 mr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
            atualizando folhas
          </span>
        )}
        {statusTexto && (
          <span className={`text-[11px] mr-1 ${estadoSave === "salvo" ? "text-green-600" : "text-gray-400"}`}>
            {statusTexto}
          </span>
        )}
        <button
          className={btn}
          onClick={() => {
            if (confirm(`Devolver a folha ${pageIndex} ao layout original? Você perde as edições feitas nela.`)) {
              ed.commit();
              ed.resetPageIndex(pageIndex);
            }
          }}
        >
          Restaurar folha
        </button>
      </div>

      {(erro || erroUpload) && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-200 text-[12px] text-red-700 shrink-0">
          {erroUpload || `Não consegui desenhar as folhas: ${erro}`}
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        <aside className="w-[112px] shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto py-3">
          {pages.length === 0 ? (
            <p className="px-3 text-[11px] text-gray-400 text-center">Desenhando…</p>
          ) : (
            pages.map((p) => {
              const n = ed.layout.elements.filter((e) => e.pageIndex === p.index).length;
              const on = p.index === pageIndex;
              return (
                <button key={p.index} onClick={() => { setPageIndex(p.index); ed.setSelected([]); }} className="block w-full px-2.5 pb-2.5 text-left group">
                  <div className={`relative rounded-sm overflow-hidden border-2 transition ${on ? "border-[#F5A623] shadow-md" : "border-gray-200 group-hover:border-gray-400"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.dataUrl} alt="" className="w-full block" />
                    {n > 0 && (
                      <span className="absolute top-1 right-1 bg-[#F5A623] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{n}</span>
                    )}
                  </div>
                  <p className={`text-[10px] mt-1 text-center font-semibold ${on ? "text-[#1A1A1A]" : "text-gray-400"}`}>{p.index}</p>
                </button>
              );
            })
          )}
        </aside>

        <CanvasViewport zoom={zoom} setZoom={setZoom} onFit={(f) => { fitRef.current = f; }}>
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
        </CanvasViewport>

        <aside className="w-[222px] shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
          <LayoutInspector
            element={atual}
            imageOptions={imageOptions}
            totalPages={pages.length || 1}
            onCommit={ed.commit}
            onPatch={(d) => atual && ed.patch(atual.id, d)}
            onRemove={() => atual && ed.remove([atual.id])}
            onChangeClip={(clip) => atual?.kind === "image" && void trocarRecorte(atual as ImageElement, clip)}
            onReorder={(to) => atual && ed.reorder(atual.id, to)}
            onPickImage={() => fileRef.current?.click()}
          />
        </aside>
      </div>
    </div>
  );
}
