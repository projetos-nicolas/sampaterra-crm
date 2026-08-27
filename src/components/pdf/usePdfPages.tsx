"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renderiza o PDF de verdade e devolve cada folha como imagem.
 *
 * É isto que faz o editor mostrar a proposta real embaixo da camada livre —
 * e não uma reimplementação do template em HTML, que divergiria do PDF no dia
 * seguinte. O que se vê no canvas é literalmente o arquivo que vai ser baixado.
 *
 * O trabalho é caro (gerar o PDF + rasterizar), então roda com atraso após a
 * última alteração e nunca duas vezes ao mesmo tempo.
 */

export interface RenderedPage {
  index: number; // 1-based, igual ao pageNumber do @react-pdf
  dataUrl: string;
  width: number; // pontos
  height: number;
}

const DEBOUNCE_MS = 700;
const SCALE = 1.6; // nitidez suficiente para zoom até ~120% sem borrar

export function usePdfPages(pdfData: any, enabled: boolean) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [rendering, setRendering] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Evita renders concorrentes e descarta resultado de execução obsoleta
  const runId = useRef(0);
  const busy = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    if (!enabled || !pdfData) return;

    const timer = setTimeout(() => {
      void run();
    }, DEBOUNCE_MS);

    async function run() {
      if (busy.current) {
        pending.current = true;
        return;
      }
      busy.current = true;
      const my = ++runId.current;
      setRendering(true);
      setErro(null);

      try {
        const [{ pdf }, { PropostaPDF }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@/lib/pdf/PropostaPDF"),
        ]);
        // @ts-ignore — JSX via @react-pdf
        const blob = await pdf(<PropostaPDF data={pdfData} />).toBlob();
        if (my !== runId.current) return;

        const buf = await blob.arrayBuffer();

        const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
        // O worker é servido de /public por caminho fixo (copiado no build por
        // scripts/copy-pdf-worker.js). Resolver via `new URL(..., import.meta.url)`
        // depende do bundler e quebra silenciosamente; caminho fixo não.
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument({
          data: buf,
          isEvalSupported: false,
          useSystemFonts: true,
        }).promise;
        if (my !== runId.current) return;

        const out: RenderedPage[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const pg = await doc.getPage(i);
          const vp = pg.getViewport({ scale: SCALE });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(vp.width);
          canvas.height = Math.ceil(vp.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await pg.render({ canvasContext: ctx, viewport: vp }).promise;
          if (my !== runId.current) return;
          const base = pg.getViewport({ scale: 1 });
          out.push({
            index: i,
            dataUrl: canvas.toDataURL("image/jpeg", 0.82),
            width: base.width,
            height: base.height,
          });
        }
        if (my !== runId.current) return;
        setPages(out);
      } catch (e: any) {
        if (my === runId.current) setErro(e?.message ?? "Falha ao desenhar as folhas.");
      } finally {
        if (my === runId.current) setRendering(false);
        busy.current = false;
        if (pending.current) {
          pending.current = false;
          void run();
        }
      }
    }

    return () => clearTimeout(timer);
  }, [pdfData, enabled]);

  return { pages, rendering, erro };
}
