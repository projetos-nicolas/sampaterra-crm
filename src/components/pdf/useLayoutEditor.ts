"use client";

import { useCallback, useRef, useState } from "react";
import {
  EMPTY_LAYOUT,
  PAGE_W,
  PAGE_H,
  type LayoutElement,
  type ProposalLayout,
} from "@/lib/pdf/layout";

/**
 * Estado da camada livre + histórico de desfazer.
 *
 * Regra do histórico: `commit()` é chamado ANTES de cada alteração, guardando
 * o estado anterior. Arrastar empilha um único passo (o commit acontece no
 * mousedown, não a cada pixel), senão um arraste viraria centenas de undos.
 */
export function useLayoutEditor(initial?: ProposalLayout | null) {
  const [layout, setLayout] = useState<ProposalLayout>(initial ?? EMPTY_LAYOUT);
  const [selected, setSelected] = useState<string[]>([]);
  const undo = useRef<ProposalLayout[]>([]);
  const redo = useRef<ProposalLayout[]>([]);
  const [, bump] = useState(0);

  const snapshot = useCallback(() => JSON.parse(JSON.stringify(layout)) as ProposalLayout, [layout]);

  const commit = useCallback(() => {
    undo.current.push(JSON.parse(JSON.stringify(layout)));
    if (undo.current.length > 80) undo.current.shift();
    redo.current = [];
    bump((n) => n + 1);
  }, [layout]);

  const doUndo = useCallback(() => {
    const prev = undo.current.pop();
    if (!prev) return;
    redo.current.push(JSON.parse(JSON.stringify(layout)));
    setLayout(prev);
    setSelected([]);
    bump((n) => n + 1);
  }, [layout]);

  const doRedo = useCallback(() => {
    const next = redo.current.pop();
    if (!next) return;
    undo.current.push(JSON.parse(JSON.stringify(layout)));
    setLayout(next);
    setSelected([]);
    bump((n) => n + 1);
  }, [layout]);

  /** Altera um elemento sem empilhar histórico (usar durante o arraste). */
  const patch = useCallback((id: string, data: Partial<LayoutElement>) => {
    setLayout((L) => ({
      ...L,
      elements: L.elements.map((e) => (e.id === id ? ({ ...e, ...data } as LayoutElement) : e)),
    }));
  }, []);

  const patchMany = useCallback((ids: string[], fn: (e: LayoutElement) => Partial<LayoutElement>) => {
    setLayout((L) => ({
      ...L,
      elements: L.elements.map((e) => (ids.includes(e.id) ? ({ ...e, ...fn(e) } as LayoutElement) : e)),
    }));
  }, []);

  const add = useCallback((el: LayoutElement) => {
    setLayout((L) => ({ ...L, elements: [...L.elements, el] }));
    setSelected([el.id]);
  }, []);

  const remove = useCallback((ids: string[]) => {
    setLayout((L) => ({ ...L, elements: L.elements.filter((e) => !ids.includes(e.id)) }));
    setSelected([]);
  }, []);

  /** Move na pilha de desenho: 'front' fica por cima de tudo. */
  const reorder = useCallback((id: string, to: "front" | "back") => {
    setLayout((L) => {
      const el = L.elements.find((e) => e.id === id);
      if (!el) return L;
      const rest = L.elements.filter((e) => e.id !== id);
      return { ...L, elements: to === "front" ? [...rest, el] : [el, ...rest] };
    });
  }, []);

  /**
   * Converte de uma vez todos os blocos de uma folha em elementos editáveis.
   *
   * Roda sozinho quando a folha é aberta no editor. O usuário não vê nada
   * disso: para ele, os campos da folha simplesmente respondem ao duplo
   * clique. Idempotente — a folha só é convertida uma vez.
   */
  const materializePage = useCallback((pageIndex: number, blocos: { id: string; el: LayoutElement }[]) => {
    setLayout((L) => {
      if (L.materialized?.includes(pageIndex)) return L;
      const novos = blocos.filter((b) => !L.detached.includes(b.id));
      if (!novos.length) {
        return { ...L, materialized: [...(L.materialized ?? []), pageIndex] };
      }
      return {
        ...L,
        detached: [...L.detached, ...novos.map((b) => b.id)],
        elements: [...L.elements, ...novos.map((b) => b.el)],
        materialized: [...(L.materialized ?? []), pageIndex],
      };
    });
  }, []);

  /**
   * Devolve uma folha ao original: descarta os elementos dela e reabilita o
   * fluxo automático dos blocos correspondentes. A folha volta a ser
   * convertida na próxima vez que for aberta.
   */
  const resetPageIndex = useCallback((pageIndex: number) => {
    setLayout((L) => {
      const naFolha = L.elements.filter((e) => e.pageIndex === pageIndex);
      const voltando = naFolha.map((e) => e.sourceId).filter(Boolean) as string[];
      return {
        ...L,
        elements: L.elements.filter((e) => e.pageIndex !== pageIndex),
        detached: L.detached.filter((d) => !voltando.includes(d)),
        materialized: (L.materialized ?? []).filter((n) => n !== pageIndex),
      };
    });
    setSelected([]);
  }, []);

  const resetAll = useCallback(() => {
    setLayout(EMPTY_LAYOUT);
    setSelected([]);
  }, []);

  return {
    layout,
    setLayout,
    selected,
    setSelected,
    commit,
    snapshot,
    undo: doUndo,
    redo: doRedo,
    canUndo: undo.current.length > 0,
    canRedo: redo.current.length > 0,
    patch,
    patchMany,
    add,
    remove,
    reorder,
    materializePage,
    resetPageIndex,
    resetAll,
  };
}

// ── Guias de alinhamento ─────────────────────────────────────────────────────

export const SNAP_TOLERANCE = 4;

export interface SnapResult {
  x: number;
  y: number;
  guidesV: number[];
  guidesH: number[];
}

/**
 * Encaixa a caixa arrastada nas bordas e centros dos outros elementos e nas
 * margens da página. Devolve a posição corrigida e onde desenhar as guias.
 */
export function snapBox(
  box: { x: number; y: number; w: number; h: number },
  others: LayoutElement[]
): SnapResult {
  const vs = [0, 50, PAGE_W / 2, PAGE_W - 50, PAGE_W];
  const hs = [0, 52, PAGE_H / 2, PAGE_H - 30, PAGE_H];
  for (const o of others) {
    if (o.hidden) continue;
    vs.push(o.x, o.x + o.w / 2, o.x + o.w);
    hs.push(o.y, o.y + o.h / 2, o.y + o.h);
  }

  let x = box.x;
  let y = box.y;
  const guidesV: number[] = [];
  const guidesH: number[] = [];

  for (const [val, off] of [
    [box.x, 0],
    [box.x + box.w / 2, box.w / 2],
    [box.x + box.w, box.w],
  ] as const) {
    const hit = vs.find((v) => Math.abs(v - val) < SNAP_TOLERANCE);
    if (hit !== undefined) {
      x = hit - off;
      guidesV.push(hit);
      break;
    }
  }
  for (const [val, off] of [
    [box.y, 0],
    [box.y + box.h / 2, box.h / 2],
    [box.y + box.h, box.h],
  ] as const) {
    const hit = hs.find((v) => Math.abs(v - val) < SNAP_TOLERANCE);
    if (hit !== undefined) {
      y = hit - off;
      guidesH.push(hit);
      break;
    }
  }
  return { x, y, guidesV, guidesH };
}
