"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PAGE_W, PAGE_H } from "@/lib/pdf/layout";

/**
 * Área de visualização da folha — a parte que dá a sensação de mesa de
 * trabalho: a folha nasce centralizada e ajustada à janela, a roda do mouse
 * rola, Ctrl+roda dá zoom no ponto do cursor, e arrastar com o botão do meio
 * ou com a barra de espaço movimenta a página.
 */
export function CanvasViewport({
  zoom,
  setZoom,
  children,
  onFit,
}: {
  zoom: number;
  setZoom: (z: number | ((z: number) => number)) => void;
  children: React.ReactNode;
  /** Recebe a função que ajusta a folha à janela, para a barra de ferramentas. */
  onFit?: (fit: () => void) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [espaco, setEspaco] = useState(false);
  const arrasto = useRef<any>(null);

  /** Ajusta a folha inteira à janela e a centraliza. */
  const fit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const margem = 48;
    const z = Math.min(
      (el.clientWidth - margem) / PAGE_W,
      (el.clientHeight - margem) / PAGE_H
    );
    const zz = Math.max(0.2, Math.min(1.6, z));
    setZoom(zz);
    setPan({
      x: (el.clientWidth - PAGE_W * zz) / 2,
      y: (el.clientHeight - PAGE_H * zz) / 2,
    });
  }, [setZoom]);

  // Enquadra na primeira medida da área e sempre que a janela muda de tamanho
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    fit();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { onFit?.(fit); }, [onFit, fit]);

  // Barra de espaço = modo mão, como em qualquer editor gráfico
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(t?.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); setEspaco(true); }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setEspaco(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  function onWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      // Zoom ancorado no cursor: o ponto sob o mouse não escorrega
      e.preventDefault();
      const r = box.current!.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const fator = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom((z) => {
        const novo = Math.max(0.2, Math.min(3, z * fator));
        setPan((p) => ({
          x: mx - ((mx - p.x) * novo) / z,
          y: my - ((my - p.y) * novo) / z,
        }));
        return novo;
      });
      return;
    }
    setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
  }

  function onMouseDown(e: React.MouseEvent) {
    // Botão do meio, ou espaço segurado: modo mão
    if (e.button === 1 || espaco) {
      e.preventDefault();
      arrasto.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    }
  }

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const a = arrasto.current;
      if (!a) return;
      setPan({ x: a.px + (e.clientX - a.sx), y: a.py + (e.clientY - a.sy) });
    };
    const up = () => { arrasto.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  return (
    <div
      ref={box}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      className="relative flex-1 min-w-0 overflow-hidden bg-[#EDEDF0]"
      style={{ cursor: espaco ? "grab" : undefined }}
    >
      <div
        style={{
          position: "absolute",
          left: pan.x,
          top: pan.y,
          width: PAGE_W * zoom,
          height: PAGE_H * zoom,
        }}
      >
        {children}
      </div>
    </div>
  );
}
