"use client";

// Carregado somente via dynamic() com ssr:false
// pois PDFViewer não funciona no servidor

import { PDFViewer } from "@react-pdf/renderer";
import { PropostaPDF, type PropostaPDFData } from "@/lib/pdf/PropostaPDF";

interface Props {
  data: PropostaPDFData;
}

export default function PDFPreviewPanel({ data }: Props) {
  return (
    <PDFViewer
      width="100%"
      height="100%"
      showToolbar={false}
      style={{ border: "none" }}
    >
      {/* @ts-ignore — JSX via @react-pdf/renderer */}
      <PropostaPDF data={data} />
    </PDFViewer>
  );
}
