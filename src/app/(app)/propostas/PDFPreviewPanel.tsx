"use client";

// Carregado somente via dynamic() com ssr:false
// pois PDFViewer não funciona no servidor

import { useRef, useState, useEffect } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { PropostaPDF, type PropostaPDFData } from "@/lib/pdf/PropostaPDF";

interface Props {
  data: PropostaPDFData;
}

export default function PDFPreviewPanel({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDims({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    ro.observe(el);
    // measure immediately
    setDims({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) });
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      {dims && dims.w > 0 && dims.h > 0 ? (
        <PDFViewer
          width={dims.w}
          height={dims.h}
          showToolbar={false}
          style={{ border: "none", display: "block" }}
        >
          {/* @ts-ignore — JSX via @react-pdf/renderer */}
          <PropostaPDF data={data} />
        </PDFViewer>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999", fontSize: 14 }}>
          Carregando preview…
        </div>
      )}
    </div>
  );
}
