"use client";

import { useEffect, useRef, useState } from "react";
import {
  PAGE_W,
  PAGE_H,
  type LayoutElement,
  type TextElement,
  type ImageElement,
  type RectElement,
} from "@/lib/pdf/layout";
import { snapBox } from "./useLayoutEditor";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number];

/** Estilos de destaque — precisam bater com os de LayoutLayer.tsx no PDF. */
function highlightCss(e: TextElement): React.CSSProperties {
  switch (e.highlight) {
    case "marker":
      return {
        background: `linear-gradient(transparent ${100 - 74}%, #FBDF8B ${100 - 74}%)`,
        backgroundSize: "100% 100%",
      };
    case "box":
      return { border: "1.4px solid #E8571A", padding: "5px 7px" };
    case "bar":
      return { borderLeft: "3px solid #E8571A", padding: "2px 0 2px 9px" };
    case "block":
      return { background: "#14130E", color: "#fff", padding: "6px 9px" };
    default:
      return {};
  }
}

function ElementView({ e }: { e: LayoutElement }) {
  if (e.kind === "text") {
    const t = e as TextElement;
    return (
      <div
        style={{
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: t.size,
          fontWeight: t.weight,
          fontStyle: t.italic ? "italic" : "normal",
          color: t.highlight === "block" ? "#fff" : t.color,
          letterSpacing: t.letterSpacing,
          lineHeight: t.lineHeight,
          textAlign: t.align,
          width: "100%",
          boxSizing: "border-box",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          ...highlightCss(t),
        }}
      >
        {t.text}
      </div>
    );
  }
  if (e.kind === "image") {
    const i = e as ImageElement;
    // O recorte já está embutido na imagem (ver clipImage.ts) — aplicar
    // clip-path aqui de novo cortaria as pontas duas vezes.
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={i.src}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: i.fit, display: "block" }}
        />
      </div>
    );
  }
  const r = e as RectElement;
  return <div style={{ width: "100%", height: "100%", background: r.fill, borderRadius: r.radius ?? 0 }} />;
}

export function PageCanvas({
  elements,
  selected,
  zoom,
  backgroundUrl,
  stale,
  onSelect,
  onCommit,
  onPatch,
  onEditText,
}: {
  elements: LayoutElement[];
  selected: string[];
  zoom: number;
  /** Imagem da folha real do PDF, desenhada atrás da camada editável. */
  backgroundUrl?: string;
  /** Aviso discreto enquanto a folha está sendo redesenhada. */
  stale?: boolean;
  onSelect: (ids: string[]) => void;
  onCommit: () => void;
  onPatch: (id: string, data: Partial<LayoutElement>) => void;
  onEditText: (id: string, text: string) => void;
}) {
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [editing, setEditing] = useState<string | null>(null);
  const dragRef = useRef<any>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  /** Nó em edição — para dar foco uma única vez ao entrar no modo texto. */
  const editRef = useRef<HTMLElement | null>(null);

  /**
   * Durante o arraste o estado do React NÃO é atualizado a cada pixel: o nó é
   * movido escrevendo direto no style. Um `setState` por movimento redesenha
   * todos os elementos da folha e faz o arraste engasgar quando a página tem
   * muita coisa. O estado só é gravado uma vez, ao soltar o botão.
   */
  function nodeOf(id: string): HTMLElement | null {
    return boxRef.current?.querySelector(`[data-el-id="${id}"]`) ?? null;
  }
  function paintNode(id: string, b: { x: number; y: number; w: number; h: number }) {
    const n = nodeOf(id);
    if (!n) return;
    n.style.left = b.x + "px";
    n.style.top = b.y + "px";
    n.style.width = b.w + "px";
    n.style.height = b.h + "px";
    const badge = n.querySelector("[data-badge]");
    if (badge) {
      badge.textContent = `${Math.round(b.x)}, ${Math.round(b.y)} · ${Math.round(b.w)}×${Math.round(b.h)}`;
    }
  }

  // Arraste e redimensionamento vivem em listeners de window para que o
  // ponteiro possa sair da folha sem "soltar" o elemento.
  useEffect(() => {
    function move(ev: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.sx) / zoom;
      const dy = (ev.clientY - d.sy) / zoom;

      if (d.mode === "move") {
        const snapped = snapBox({ x: d.ox + dx, y: d.oy + dy, w: d.ow, h: d.oh }, d.others);
        setGuides({ v: snapped.guidesV, h: snapped.guidesH });
        d.last = { x: snapped.x, y: snapped.y, w: d.ow, h: d.oh };
        paintNode(d.id, d.last);
        return;
      }

      let { ox, oy, ow, oh } = d;
      const h: Handle = d.handle;
      if (h.includes("e")) ow = Math.max(8, d.ow + dx);
      if (h.includes("s")) oh = Math.max(8, d.oh + dy);
      if (h.includes("w")) {
        ow = Math.max(8, d.ow - dx);
        ox = d.ox + (d.ow - ow);
      }
      if (h.includes("n")) {
        oh = Math.max(8, d.oh - dy);
        oy = d.oy + (d.oh - oh);
      }
      // Shift mantém a proporção — importante para foto não distorcer.
      if (ev.shiftKey && d.kind === "image") oh = ow * (d.oh / d.ow);
      d.last = { x: ox, y: oy, w: ow, h: oh };
      paintNode(d.id, d.last);
    }
    function up() {
      const d = dragRef.current;
      dragRef.current = null;
      setGuides({ v: [], h: [] });
      // Grava no estado uma única vez, com a posição final
      if (d?.last) onPatch(d.id, d.last);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [zoom, onPatch]);

  function startDrag(ev: React.MouseEvent, el: LayoutElement, handle?: Handle) {
    if (el.locked || editing) return;
    ev.preventDefault();
    ev.stopPropagation();
    onCommit();
    dragRef.current = {
      mode: handle ? "resize" : "move",
      handle,
      id: el.id,
      kind: el.kind,
      sx: ev.clientX,
      sy: ev.clientY,
      ox: el.x,
      oy: el.y,
      ow: el.w,
      oh: el.h,
      // Congela os vizinhos no início: as guias não mudam durante o arraste
      others: elements.filter((o) => o.id !== el.id),
      last: null as any,
    };
  }

  return (
    <div
      ref={boxRef}
      onMouseDown={() => onSelect([])}
      style={{
        position: "relative",
        width: PAGE_W,
        height: PAGE_H,
        background: "#fff",
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
        boxShadow: "0 2px 8px rgba(0,0,0,.14), 0 16px 44px rgba(0,0,0,.16)",
        overflow: "hidden",
        userSelect: "none",
        flex: "none",
      }}
    >
      {/* A folha de verdade. É o PDF rasterizado, não uma imitação em HTML —
          o que aparece aqui é exatamente o arquivo que será baixado. */}
      {backgroundUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundUrl}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            opacity: stale ? 0.55 : 1,
            transition: "opacity .2s",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          Desenhando a folha…
        </div>
      )}

      {elements.map((e) => {
        if (e.hidden) return null;
        const isSel = selected.includes(e.id);
        return (
          <div
            key={e.id}
            data-el-id={e.id}
            onMouseDown={(ev) => {
              ev.stopPropagation();
              if (e.locked) {
                onSelect([]);
                return;
              }
              onSelect(ev.shiftKey ? [...selected, e.id] : [e.id]);
              startDrag(ev, e);
            }}
            onDoubleClick={() => e.kind === "text" && !e.locked && setEditing(e.id)}
            style={{
              position: "absolute",
              left: e.x,
              top: e.y,
              width: e.w,
              height: e.h,
              opacity: e.opacity,
              cursor: e.locked ? "default" : editing === e.id ? "text" : "move",
              outline: isSel ? "1.5px solid #2F6FE4" : undefined,
              // O selecionado sobe na pilha: senão outro elemento sobreposto
              // cobre as alças e o clique de redimensionar nunca chega nelas.
              zIndex: isSel ? 30 : undefined,
            }}
          >
            {editing === e.id && e.kind === "text" ? (
              <div
                // O conteúdo NÃO é filho React: se fosse, cada re-render
                // reescreveria o nó e apagaria o que está sendo digitado.
                // O texto entra uma vez, junto com o foco e o cursor no fim.
                ref={(n) => {
                  if (n && editRef.current !== n) {
                    editRef.current = n;
                    n.innerText = (e as TextElement).text;
                    n.focus();
                    const r = document.createRange();
                    r.selectNodeContents(n);
                    r.collapse(false);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(r);
                  }
                }}
                contentEditable
                suppressContentEditableWarning
                onMouseDown={(ev) => ev.stopPropagation()}
                onBlur={(ev) => {
                  const texto = ev.currentTarget.innerText;
                  editRef.current = null;
                  setEditing(null);
                  if (texto !== (e as TextElement).text) {
                    onCommit();
                    onEditText(e.id, texto);
                  }
                }}
                onKeyDown={(ev) => {
                  ev.stopPropagation();
                  if (ev.key === "Escape") (ev.target as HTMLElement).blur();
                  // Enter com Ctrl/Cmd encerra; Enter sozinho quebra linha
                  if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
                    ev.preventDefault();
                    (ev.target as HTMLElement).blur();
                  }
                }}
                style={{
                  fontFamily: "Helvetica, Arial, sans-serif",
                  fontSize: (e as TextElement).size,
                  fontWeight: (e as TextElement).weight,
                  color: (e as TextElement).color,
                  lineHeight: (e as TextElement).lineHeight,
                  textAlign: (e as TextElement).align,
                  letterSpacing: (e as TextElement).letterSpacing,
                  width: "100%",
                  minHeight: "1em",
                  outline: "1.5px solid #E8571A",
                  whiteSpace: "pre-wrap",
                  cursor: "text",
                }}
              />
            ) : (
              <ElementView e={e} />
            )}

            {isSel && !e.locked && editing !== e.id && (
              <>
                <div
                  data-badge=""
                  style={{
                    position: "absolute",
                    zIndex: 41,
                    top: -18,
                    left: 0,
                    background: "#2F6FE4",
                    color: "#fff",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 9,
                    padding: "1px 5px",
                    borderRadius: 3,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  {Math.round(e.x)}, {Math.round(e.y)} · {Math.round(e.w)}×{Math.round(e.h)}
                </div>
                {HANDLES.map((h) => (
                  <div
                    key={h}
                    onMouseDown={(ev) => startDrag(ev, e, h)}
                    style={{
                      position: "absolute",
                      width: 11,
                      height: 11,
                      background: "#fff",
                      border: "1.5px solid #2F6FE4",
                      borderRadius: 2,
                      // Acima de qualquer conteúdo do próprio elemento
                      zIndex: 40,
                      // Alvo generoso: com zoom em 60% a alça desenhada tem
                      // poucos pixels na tela e vira uma caça ao mouse.
                      boxShadow: "0 0 0 4px rgba(47,111,228,.001)",
                      cursor:
                        h === "n" || h === "s"
                          ? "ns-resize"
                          : h === "e" || h === "w"
                          ? "ew-resize"
                          : h === "nw" || h === "se"
                          ? "nwse-resize"
                          : "nesw-resize",
                      ...handlePos(h),
                    }}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}

      {guides.v.map((x, i) => (
        <div key={"v" + i} style={{ position: "absolute", left: x, top: 0, bottom: 0, width: 1, background: "#E5397F", pointerEvents: "none" }} />
      ))}
      {guides.h.map((y, i) => (
        <div key={"h" + i} style={{ position: "absolute", top: y, left: 0, right: 0, height: 1, background: "#E5397F", pointerEvents: "none" }} />
      ))}
    </div>
  );
}

function handlePos(h: Handle): React.CSSProperties {
  const m = -6;
  const meio = "calc(50% - 5.5px)";
  switch (h) {
    case "nw": return { left: m, top: m };
    case "n":  return { left: meio, top: m };
    case "ne": return { right: m, top: m };
    case "e":  return { right: m, top: meio };
    case "se": return { right: m, bottom: m };
    case "s":  return { left: meio, bottom: m };
    case "sw": return { left: m, bottom: m };
    case "w":  return { left: m, top: meio };
  }
}
