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

const HEX_CLIP = "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)";

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
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          clipPath: i.clip === "hex" ? HEX_CLIP : undefined,
          borderRadius: i.clip === "circle" ? "50%" : undefined,
        }}
      >
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

  // Arraste e redimensionamento vivem em listeners de window para que o
  // ponteiro possa sair da folha sem "soltar" o elemento.
  useEffect(() => {
    function move(ev: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.sx) / zoom;
      const dy = (ev.clientY - d.sy) / zoom;

      if (d.mode === "move") {
        const others = elements.filter((o) => o.id !== d.id);
        const snapped = snapBox({ x: d.ox + dx, y: d.oy + dy, w: d.ow, h: d.oh }, others);
        setGuides({ v: snapped.guidesV, h: snapped.guidesH });
        onPatch(d.id, { x: snapped.x, y: snapped.y });
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
      onPatch(d.id, { x: ox, y: oy, w: ow, h: oh });
    }
    function up() {
      if (!dragRef.current) return;
      dragRef.current = null;
      setGuides({ v: [], h: [] });
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [elements, zoom, onPatch]);

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
        transformOrigin: "top center",
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
            }}
          >
            {editing === e.id && e.kind === "text" ? (
              <div
                contentEditable
                suppressContentEditableWarning
                autoFocus
                onBlur={(ev) => {
                  onCommit();
                  onEditText(e.id, ev.currentTarget.innerText);
                  setEditing(null);
                }}
                onKeyDown={(ev) => {
                  ev.stopPropagation();
                  if (ev.key === "Escape") (ev.target as HTMLElement).blur();
                }}
                style={{
                  fontFamily: "Helvetica, Arial, sans-serif",
                  fontSize: (e as TextElement).size,
                  fontWeight: (e as TextElement).weight,
                  color: (e as TextElement).color,
                  lineHeight: (e as TextElement).lineHeight,
                  textAlign: (e as TextElement).align,
                  width: "100%",
                  outline: "1.5px solid #E8571A",
                  whiteSpace: "pre-wrap",
                }}
              >
                {(e as TextElement).text}
              </div>
            ) : (
              <ElementView e={e} />
            )}

            {isSel && !e.locked && editing !== e.id && (
              <>
                <div
                  style={{
                    position: "absolute",
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
                      width: 9,
                      height: 9,
                      background: "#fff",
                      border: "1.5px solid #2F6FE4",
                      borderRadius: 2,
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
  const m = -5;
  switch (h) {
    case "nw": return { left: m, top: m };
    case "n":  return { left: "calc(50% - 4.5px)", top: m };
    case "ne": return { right: m, top: m };
    case "e":  return { right: m, top: "calc(50% - 4.5px)" };
    case "se": return { right: m, bottom: m };
    case "s":  return { left: "calc(50% - 4.5px)", bottom: m };
    case "sw": return { left: m, bottom: m };
    case "w":  return { left: m, top: "calc(50% - 4.5px)" };
  }
}
