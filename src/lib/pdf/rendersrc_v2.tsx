import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image as PDFImage,
  Svg,
  Defs,
  ClipPath,
  Polygon,
} from "@react-pdf/renderer";
import { PORTFOLIO_IMGS } from "./portfolioAssets";

export type SectionType = "text" | "pagamento";

export interface PDFSection {
  id: string;
  title: string;
  content: string;
  type: SectionType;
}

export interface PagamentoItem {
  descricao: string;
  valor: number;
  ordem: number;
}

export interface PropostaPDFData {
  code: string;
  title: string;
  date: string;
  clientName: string;
  clientCompany?: string;
  clientCnpj?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  sections: PDFSection[];
  valorTotal: number;
  pagamentos: PagamentoItem[];
  imagens: string[];
}

const C = {
  teal: "#1A1A1A",
  tealDark: "#0a3835",
  orange: "#F5A623",
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray300: "#D1D5DB",
  gray500: "#6B7280",
  gray700: "#374151",
  gray900: "#111827",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: C.gray900, backgroundColor: C.white },
  brandPage: { padding: 0 },
  brandDecorWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  brandOrangeBand: { position: "absolute", top: -180, right: -40, width: 150, height: 1180, backgroundColor: C.orange, transform: "rotate(12deg)" },
  brandTealBand: { position: "absolute", top: -180, right: -130, width: 22, height: 1180, backgroundColor: C.teal, transform: "rotate(12deg)" },
  brandInner: { padding: "44px 50px 60px", position: "relative" },
  brandTopRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 26 },
  brandLogoBar: { width: 4, height: 16, backgroundColor: C.orange },
  brandLogoText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.teal, letterSpacing: 2.5 },
  brandLogoSub: { fontSize: 6, color: C.gray500, letterSpacing: 1.5, marginTop: 1 },
  brandMarkRow: { flexDirection: "row", gap: 3, marginLeft: "auto" },
  brandMarkLine: { width: 2.5, height: 16, backgroundColor: C.tealDark, transform: "rotate(-18deg)" },
  brandSectionRow: { flexDirection: "row", gap: 26, marginBottom: 26 },
  brandTextCol: { flex: 1.35 },
  brandH1: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1A1A1A", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 10 },
  brandBody: { fontSize: 8.6, color: C.gray700, lineHeight: 1.7, marginBottom: 8 },
  brandPhotoCol: { width: 168, alignItems: "flex-end" },
  brandPhotoBox: { width: 158, height: 130, borderRadius: 2, overflow: "hidden" },
  brandPhotoImg: { width: "100%", height: "100%", objectFit: "cover" },
  brandFullCol: { width: "100%" },
  hexRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  hexItem: { alignItems: "center" },
  hexBar: { width: 26, height: 2, backgroundColor: C.orange, marginTop: 7, marginBottom: 4 },
  hexLabel: { fontSize: 6.3, fontFamily: "Helvetica-Bold", color: C.teal, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4 },
  hexBarLight: { width: 26, height: 2, backgroundColor: C.white, marginTop: 7, marginBottom: 4 },
  hexLabelLight: { fontSize: 6.3, fontFamily: "Helvetica-Bold", color: C.white, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4 },
  pageFooter: { position: "absolute", bottom: 20, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.gray300, paddingTop: 6 },
  pageFooterText: { fontSize: 6.5, color: C.gray500 },
});

function PageFooter() {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.pageFooterText}>
        SAMPA TERRA TERRAPLANAGEM E DEMOLICAO | contato@sampaterra.com | (11) 99207-7014
      </Text>
      <Text style={s.pageFooterText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function HexImage({ src, size = 100 }: { src: string; size?: number }) {
  const cx = size / 2;
  const pts = [
    [cx, 0],
    [size, size * 0.25],
    [size, size * 0.75],
    [cx, size],
    [0, size * 0.75],
    [0, size * 0.25],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
  const clipId = `hex-${src.slice(-12).replace(/[^a-zA-Z0-9]/g, "")}-${size}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={pts} />
        </ClipPath>
      </Defs>
      <PDFImage src={src} x={0} y={0} width={size} height={size} clipPath={`url(#${clipId})`} />
    </Svg>
  );
}

export function PropostaPDFPage2Only() {
  return (
    <Document>
      <Page size="A4" style={[s.page, s.brandPage]}>
        <View style={s.brandDecorWrap}>
          <View style={s.brandTealBand} />
          <View style={s.brandOrangeBand} />
        </View>

        <View style={s.brandInner}>
          <View style={s.brandTopRow}>
            <View style={s.brandLogoBar} />
            <View>
              <Text style={s.brandLogoText}>SAMPA TERRA</Text>
              <Text style={s.brandLogoSub}>ENGENHARIA E CONSTRUÇÕES</Text>
            </View>
            <View style={s.brandMarkRow}>
              <View style={s.brandMarkLine} />
              <View style={s.brandMarkLine} />
              <View style={s.brandMarkLine} />
              <View style={s.brandMarkLine} />
            </View>
          </View>

          <View style={s.brandSectionRow}>
            <View style={s.brandTextCol}>
              <Text style={s.brandH1}>Quem Somos</Text>
              <Text style={s.brandBody}>
                Contratar a Sampa Terra é garantir inteligência aplicada à engenharia.
                Nosso foco é otimizar cada etapa do seu projeto estrutural, proporcionando
                redução de custos em materiais essenciais, como aço e concreto, sem abrir
                mão da segurança máxima.
              </Text>
              <Text style={s.brandBody}>
                Contamos com uma equipe de engenheiros e calculistas altamente qualificados
                que utilizam tecnologias avançadas para oferecer suporte contínuo e
                personalizado. Estamos prontos para ser o braço direito de construtoras
                e investidores, assegurando agilidade na entrega e compromisso total com
                o resultado final.
              </Text>
            </View>
            <View style={s.brandPhotoCol}>
              <View style={s.brandPhotoBox}>
                <PDFImage src={PORTFOLIO_IMGS.quemSomos} style={s.brandPhotoImg} />
              </View>
            </View>
          </View>

          <View style={s.brandFullCol}>
            <Text style={s.brandH1}>Obras e Projetos</Text>
            <Text style={s.brandBody}>
              O portfólio da Sampa Terra é o reflexo do nosso compromisso com a precisão
              técnica e a viabilidade construtiva. Ao longo da nossa trajetória,
              consolidamos nossa expertise em uma ampla gama de projetos, que vão
              desde complexos industriais e galpões de grande porte até reformas
              estruturais detalhadas.
            </Text>
            <Text style={s.brandBody}>
              Cada obra realizada carrega nossa assinatura de eficiência: projetos
              estruturais otimizados que geram economia real de insumos e um
              acompanhamento rigoroso que garante que a visão do cliente seja
              fielmente traduzida na obra pronta.
            </Text>

            <View style={s.hexRow}>
              {([
                { img: PORTFOLIO_IMGS.concreto, label: "CONCRETO ARMADO", onBand: false },
                { img: PORTFOLIO_IMGS.metalica, label: "METÁLICA", onBand: false },
                { img: PORTFOLIO_IMGS.alvenaria, label: "ALVENARIA ESTRUTURAL", onBand: true },
                { img: PORTFOLIO_IMGS.prefabricado, label: "PRÉ-FABRICADO", onBand: true },
              ] as { img: string; label: string; onBand: boolean }[]).map(({ img, label, onBand }) => (
                <View key={label} style={s.hexItem}>
                  <HexImage src={img} size={100} />
                  <View style={onBand ? s.hexBarLight : s.hexBar} />
                  <Text style={onBand ? s.hexLabelLight : s.hexLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <PageFooter />
      </Page>
    </Document>
  );
}
