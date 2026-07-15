import React from "react";
// Template de PDF para Propostas — Sampa Terra e Construções
// Gerado com @react-pdf/renderer

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

// ─── Tipos Exportados ────────────────────────────────────────────────────────

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
  /** Apenas as seções habilitadas, em ordem — o PDF as numera 1..N */
  sections: PDFSection[];
  valorTotal: number;
  pagamentos: PagamentoItem[];
  imagens: string[];
}

// ─── Paleta ──────────────────────────────────────────────────────────────────

const C = {
  teal:      "#1A1A1A",
  tealDark:  "#0a3835",
  orange:    "#F5A623",
  white:     "#FFFFFF",
  gray50:    "#F9FAFB",
  gray100:   "#F3F4F6",
  gray300:   "#D1D5DB",
  gray500:   "#6B7280",
  gray700:   "#374151",
  gray900:   "#111827",
};

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // globais
  page:         { fontFamily: "Helvetica", fontSize: 9, color: C.gray900, backgroundColor: C.white },
  contentPage:  { padding: "36px 48px 60px" },
  imagePage:    { backgroundColor: "#000", padding: 0 },
  signPage:     { padding: "36px 48px 60px" },

  // capa
  coverPage:    { backgroundColor: C.teal, flexDirection: "column", justifyContent: "space-between" },
  coverTop:     { padding: "40px 48px 0", flexDirection: "row", alignItems: "center", gap: 10 },
  coverOrangeBar: { width: 4, height: 28, backgroundColor: C.orange },
  coverBrand:   { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 3 },
  coverBrandSub:{ fontSize: 7, color: "#ffffff88", letterSpacing: 2, marginTop: 2 },
  coverCenter:  { flex: 1, justifyContent: "center", alignItems: "flex-start", padding: "0 48px" },
  coverTitle:   { fontSize: 30, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 1, lineHeight: 1.2, marginBottom: 8 },
  coverSubtitle:{ fontSize: 12, color: "#ffffff99", letterSpacing: 0.3, marginBottom: 24 },
  coverDivider: { width: 48, height: 3, backgroundColor: C.orange, marginBottom: 20 },
  coverClientLabel: { fontSize: 7, color: "#ffffff66", letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 },
  coverClientName:  { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.white },
  coverBottom:  { backgroundColor: C.orange, padding: "10px 48px", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  coverBottomText: { fontSize: 8, color: C.white, letterSpacing: 1 },

  // cabeçalho/rodapé das páginas de conteúdo
  pageHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 2, borderBottomColor: C.teal, paddingBottom: 8, marginBottom: 20 },
  pageHeaderBrand: { flexDirection: "row", alignItems: "center", gap: 6 },
  pageHeaderBar:   { width: 3, height: 14, backgroundColor: C.orange },
  pageHeaderName:  { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.teal, letterSpacing: 2 },
  pageHeaderSub:   { fontSize: 6, color: C.gray500, letterSpacing: 1 },
  pageHeaderCode:  { fontSize: 7, color: C.gray500, textAlign: "right" },
  pageHeaderTitle: { fontSize: 7, color: C.gray500, textAlign: "right", marginTop: 1 },
  pageFooter:   { position: "absolute", bottom: 20, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.gray300, paddingTop: 6 },
  pageFooterText: { fontSize: 6.5, color: C.gray500 },

  // tipografia de seção
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.teal, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.teal + "33" },
  sectionRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  sectionNum:   { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.orange + "44", width: 28, lineHeight: 1 },
  sectionH:     { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.teal, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  bodyText:     { fontSize: 8.5, color: C.gray700, lineHeight: 1.65, marginBottom: 3 },
  bullet:       { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
  bulletDot:    { width: 10, fontSize: 8.5, color: C.orange, fontFamily: "Helvetica-Bold" },
  bulletText:   { flex: 1, fontSize: 8.5, color: C.gray700, lineHeight: 1.55 },

  // cliente
  clientBox:    { backgroundColor: C.gray50, borderRadius: 5, padding: 12, borderLeftWidth: 3, borderLeftColor: C.teal, marginBottom: 12 },
  clientLabel_: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.orange, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 },
  clientRow:    { flexDirection: "row", marginBottom: 3 },
  clientKey:    { fontSize: 7.5, color: C.gray500, width: 65 },
  clientVal:    { flex: 1, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.gray900 },

  // tabela de pagamento
  payTable:     { marginTop: 6, borderWidth: 1, borderColor: C.gray300, borderRadius: 4, overflow: "hidden" },
  payHead:      { flexDirection: "row", backgroundColor: C.teal, padding: "6px 10px" },
  payHeadCell:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.white, textTransform: "uppercase", letterSpacing: 0.5 },
  payRow:       { flexDirection: "row", padding: "7px 10px", borderTopWidth: 1, borderTopColor: C.gray100 },
  payRowAlt:    { backgroundColor: C.gray50 },
  payCell:      { fontSize: 8.5, color: C.gray700 },
  payCellBold:  { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.gray900 },
  payTotal:     { flexDirection: "row", padding: "8px 10px", backgroundColor: C.teal + "0f", borderTopWidth: 1, borderTopColor: C.teal + "33" },
  payTotalLbl:  { flex: 1, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.teal, textTransform: "uppercase" },
  payTotalVal:  { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.teal },
  bankBox:      { marginTop: 10, padding: 10, backgroundColor: C.gray50, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: C.orange },
  bankTitle:    { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.orange, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 },
  bankRow:      { flexDirection: "row", marginBottom: 2 },
  bankKey:      { fontSize: 7.5, color: C.gray500, width: 60 },
  bankVal:      { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.gray900 },

  // "Obras e Projetos" grid de fotos
  portfolioGrid:  { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 4 },
  portfolioItem:  { flex: 1, alignItems: "center" },
  portfolioImg:   { width: "100%", height: 90, objectFit: "cover", borderRadius: 3 },
  portfolioBar:   { width: 28, height: 2, backgroundColor: C.orange, marginTop: 5, marginBottom: 4 },
  portfolioLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.teal, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },

  // ── página institucional "Quem Somos / Obras e Projetos" ──
  brandPage:      { padding: 0 },
  brandDecorWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  brandOrangeBand:{ position: "absolute", top: -180, right: -40, width: 150, height: 1180, backgroundColor: C.orange, transform: "rotate(12deg)" },
  brandTealBand:  { position: "absolute", top: -180, right: -130, width: 22, height: 1180, backgroundColor: C.teal, transform: "rotate(12deg)" },
  brandInner:     { padding: "44px 50px 60px", position: "relative" },
  brandTopRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 26 },
  brandLogoBar:   { width: 4, height: 16, backgroundColor: C.orange },
  brandLogoText:  { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.teal, letterSpacing: 2.5 },
  brandLogoSub:   { fontSize: 6, color: C.gray500, letterSpacing: 1.5, marginTop: 1 },
  brandMarkRow:   { flexDirection: "row", gap: 3, marginLeft: "auto" },
  brandMarkLine:  { width: 2.5, height: 16, backgroundColor: C.tealDark, transform: "rotate(-18deg)" },

  brandSectionRow:{ flexDirection: "row", gap: 26, marginBottom: 26 },
  brandTextCol:   { flex: 1.35 },
  brandH1:        { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1A1A1A", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 10 },
  brandBody:      { fontSize: 8.6, color: C.gray700, lineHeight: 1.7, marginBottom: 8 },
  brandPhotoCol:  { width: 168, alignItems: "flex-end" },
  brandPhotoBox:  { width: 158, height: 130, borderRadius: 2, overflow: "hidden" },
  brandPhotoImg:  { width: "100%", height: "100%", objectFit: "cover" },

  brandFullCol:   { width: "100%" },

  hexRow:         { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  hexItem:        { alignItems: "center" },
  hexBar:         { width: 26, height: 2, backgroundColor: C.orange, marginTop: 7, marginBottom: 4 },
  hexLabel:       { fontSize: 6.3, fontFamily: "Helvetica-Bold", color: C.teal, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4 },
  // variante usada nos itens que caem sobre a faixa diagonal colorida (contraste claro)
  hexBarLight:    { width: 26, height: 2, backgroundColor: C.white, marginTop: 7, marginBottom: 4 },
  hexLabelLight:  { fontSize: 6.3, fontFamily: "Helvetica-Bold", color: C.white, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4 },

  // assinaturas
  signRow:      { flexDirection: "row", justifyContent: "space-between", marginTop: 28, gap: 20 },
  signBlock:    { flex: 1 },
  signLine:     { borderBottomWidth: 1, borderBottomColor: C.gray700, marginBottom: 5, marginTop: 44 },
  signLabel:    { fontSize: 8, color: C.gray700, textAlign: "center" },
  signSub:      { fontSize: 7, color: C.gray500, textAlign: "center", marginTop: 2 },

  fullImage:    { width: "100%", height: "100%", objectFit: "contain" },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function PageHeader({ code, title }: { code: string; title: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <View style={s.pageHeaderBrand}>
        <View style={s.pageHeaderBar} />
        <View>
          <Text style={s.pageHeaderName}>SAMPA TERRA</Text>
          <Text style={s.pageHeaderSub}>ENGENHARIA E CONSTRUÇÕES</Text>
        </View>
      </View>
      <View>
        <Text style={s.pageHeaderCode}>{code}</Text>
        <Text style={s.pageHeaderTitle}>{title}</Text>
      </View>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.pageFooterText}>
        SAMPA TERRA CONSTRUÇÕES E ENGENHARIA | contato@sampaterra.com | (11) 99207-7014
      </Text>
      <Text
        style={s.pageFooterText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

/** Renderiza uma seção com número automático */
function SectionBlock({
  number,
  section,
  pagamentos,
  valorTotal,
}: {
  number: number;
  section: PDFSection;
  pagamentos: PagamentoItem[];
  valorTotal: number;
}) {
  const lines = section.content.split("\n");

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Título */}
      <View style={s.sectionRow} wrap={false}>
        <Text style={s.sectionNum}>{number}.</Text>
        <View style={{ flex: 1, marginTop: 2 }}>
          <Text style={s.sectionH}>{section.title.toUpperCase()}</Text>
        </View>
      </View>

      {/* Conteúdo */}
      {section.type === "pagamento" ? (
        <PaymentContent pagamentos={pagamentos} valorTotal={valorTotal} />
      ) : (
        lines.map((line, i) => {
          if (!line.trim()) return null;
          const isBullet = /^[\s]*[•\-\*]/.test(line);
          if (isBullet) {
            return (
              <View key={i} style={s.bullet}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>{line.replace(/^[\s•\-\*]+/, "").trim()}</Text>
              </View>
            );
          }
          return <Text key={i} style={s.bodyText}>{line}</Text>;
        })
      )}
    </View>
  );
}

function PaymentContent({
  pagamentos,
  valorTotal,
}: {
  pagamentos: PagamentoItem[];
  valorTotal: number;
}) {
  return (
    <View>
      <Text style={[s.bodyText, { marginBottom: 6 }]}>
        Pela execução dos serviços, o CONTRATANTE pagará o valor de{" "}
        <Text style={{ fontFamily: "Helvetica-Bold", color: C.teal }}>
          {formatBRL(valorTotal)}
        </Text>
        , conforme condições abaixo:
      </Text>

      <View style={s.payTable}>
        <View style={s.payHead}>
          <Text style={[s.payHeadCell, { flex: 0.4 }]}>#</Text>
          <Text style={[s.payHeadCell, { flex: 3 }]}>Descrição / Condição</Text>
          <Text style={[s.payHeadCell, { flex: 1.5, textAlign: "right" }]}>Valor</Text>
        </View>
        {pagamentos.map((p, i) => (
          <View key={i} style={[s.payRow, i % 2 === 1 ? s.payRowAlt : {}]}>
            <Text style={[s.payCell, { flex: 0.4 }]}>{i + 1}.</Text>
            <Text style={[s.payCell, { flex: 3 }]}>{p.descricao}</Text>
            <Text style={[s.payCellBold, { flex: 1.5, textAlign: "right" }]}>
              {formatBRL(p.valor)}
            </Text>
          </View>
        ))}
        <View style={s.payTotal}>
          <Text style={s.payTotalLbl}>Total</Text>
          <Text style={s.payTotalVal}>{formatBRL(valorTotal)}</Text>
        </View>
      </View>

      <View style={s.bankBox}>
        <Text style={s.bankTitle}>Dados para Pagamento</Text>
        {[
          ["Banco", "INTER - 077"],
          ["Empresa", "SAMPA TERRA CONSTRUCOES E ENGENHARIA LTDA"],
          ["CNPJ", "45.134.708/0001-73"],
          ["Agência", "0001"],
          ["Conta", "8402098-9"],
        ].map(([k, v], i) => (
          <View key={i} style={s.bankRow}>
            <Text style={s.bankKey}>{k}:</Text>
            <Text style={s.bankVal}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Foto recortada em formato de hexágono (grid "Obras e Projetos") */
function HexImage({ src, size = 100 }: { src: string; size?: number }) {
  const cx = size / 2;
  const r = size / 2;
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

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <ClipPath id={`hex-${src.slice(-12).replace(/[^a-zA-Z0-9]/g, "")}-${size}`}>
          <Polygon points={pts} />
        </ClipPath>
      </Defs>
      <PDFImage
        src={src}
        x={0}
        y={0}
        width={size}
        height={size}
        clipPath={`url(#hex-${src.slice(-12).replace(/[^a-zA-Z0-9]/g, "")}-${size})`}
      />
    </Svg>
  );
}

// ─── Documento Principal ──────────────────────────────────────────────────────

export function PropostaPDF({ data }: { data: PropostaPDFData }) {
  const clientDisplay = data.clientCompany || data.clientName;

  return (
    <Document
      title={`${data.code} - ${data.title}`}
      author="Sampa Terra Construções e Engenharia"
    >
      {/* ── CAPA ── */}
      <Page size="A4" style={[s.page, s.coverPage]}>
        <View style={s.coverTop}>
          <View style={s.coverOrangeBar} />
          <View>
            <Text style={s.coverBrand}>SAMPA TERRA</Text>
            <Text style={s.coverBrandSub}>ENGENHARIA E CONSTRUÇÕES</Text>
          </View>
        </View>

        <View style={s.coverCenter}>
          <Text style={s.coverTitle}>PROPOSTA{"\n"}TÉCNICA</Text>
          <View style={s.coverDivider} />
          <Text style={s.coverSubtitle}>{data.title}</Text>
          <Text style={s.coverClientLabel}>CLIENTE</Text>
          <Text style={s.coverClientName}>{clientDisplay}</Text>
          {data.clientCnpj && (
            <Text style={{ fontSize: 9, color: "#ffffff66", marginTop: 3 }}>
              {data.clientCnpj}
            </Text>
          )}
        </View>

        <View style={s.coverBottom}>
          <Text style={s.coverBottomText}>www.sampaterra.com.br</Text>
          <Text style={s.coverBottomText}>{data.code} · {data.date}</Text>
        </View>
      </Page>

      {/* ── QUEM SOMOS + OBRAS E PROJETOS (página institucional) ── */}
      <Page size="A4" style={[s.page, s.brandPage]}>
        {/* faixas diagonais decorativas */}
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

          {/* Quem Somos */}
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

          {/* Obras e Projetos */}
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

            {/* Grid de fotos de portfólio em hexágono */}
            <View style={s.hexRow}>
              {([
                { img: PORTFOLIO_IMGS.concreto,     label: "CONCRETO ARMADO",      onBand: false },
                { img: PORTFOLIO_IMGS.metalica,     label: "METÁLICA",             onBand: false },
                { img: PORTFOLIO_IMGS.alvenaria,    label: "ALVENARIA ESTRUTURAL", onBand: true },
                { img: PORTFOLIO_IMGS.prefabricado, label: "PRÉ-FABRICADO",        onBand: true },
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

      {/* ── DADOS DO CLIENTE + SEÇÕES DINÂMICAS ── */}
      <Page size="A4" style={[s.page, s.contentPage]}>
        <PageHeader code={data.code} title={data.title} />

        {/* Dados do Cliente */}
        <View style={{ marginBottom: 16 }}>
          <Text style={s.sectionTitle}>Dados do Cliente</Text>
          <View style={s.clientBox}>
            <Text style={s.clientLabel_}>CONTRATANTE</Text>
            {data.clientCompany && (
              <View style={s.clientRow}>
                <Text style={s.clientKey}>Empresa:</Text>
                <Text style={s.clientVal}>{data.clientCompany}</Text>
              </View>
            )}
            <View style={s.clientRow}>
              <Text style={s.clientKey}>Nome:</Text>
              <Text style={s.clientVal}>{data.clientName}</Text>
            </View>
            {data.clientCnpj && (
              <View style={s.clientRow}>
                <Text style={s.clientKey}>CPF/CNPJ:</Text>
                <Text style={s.clientVal}>{data.clientCnpj}</Text>
              </View>
            )}
            {data.clientPhone && (
              <View style={s.clientRow}>
                <Text style={s.clientKey}>Telefone:</Text>
                <Text style={s.clientVal}>{data.clientPhone}</Text>
              </View>
            )}
            {data.clientEmail && (
              <View style={s.clientRow}>
                <Text style={s.clientKey}>E-mail:</Text>
                <Text style={s.clientVal}>{data.clientEmail}</Text>
              </View>
            )}
            {data.clientAddress && (
              <View style={s.clientRow}>
                <Text style={s.clientKey}>Endereço:</Text>
                <Text style={s.clientVal}>{data.clientAddress}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Seções dinâmicas (fluem para páginas adicionais automaticamente) */}
        {data.sections.map((section, i) => (
          <SectionBlock
            key={section.id}
            number={i + 1}
            section={section}
            pagamentos={data.pagamentos}
            valorTotal={data.valorTotal}
          />
        ))}

        <PageFooter />
      </Page>

      {/* ── PÁGINAS DE IMAGENS ── */}
      {data.imagens.map((src, i) => (
        <Page key={`img-${i}`} size="A4" style={[s.page, s.imagePage]}>
          <PDFImage src={src} style={s.fullImage} />
        </Page>
      ))}

      {/* ── ASSINATURAS ── */}
      <Page size="A4" style={[s.page, s.signPage]}>
        <PageHeader code={data.code} title={data.title} />

        <View style={{ marginTop: 16 }}>
          <Text style={s.sectionTitle}>Assinaturas</Text>
          <Text style={s.bodyText}>Diadema - SP, {data.date}</Text>
          <Text style={s.bodyText}>
            As partes, estando de acordo com os termos e condições desta proposta,
            assinam o presente instrumento:
          </Text>
        </View>

        <View style={s.signRow}>
          <View style={s.signBlock}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>CONTRATADA</Text>
            <Text style={s.signSub}>SAMPA TERRA CONSTRUCOES E ENGENHARIA LTDA</Text>
            <Text style={s.signSub}>CNPJ: 45.134.708/0001-73</Text>
            <Text style={[s.signSub, { marginTop: 4 }]}>RUBENS FIGUEIREDO LOURENÇO</Text>
          </View>
          <View style={s.signBlock}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>CONTRATANTE</Text>
            <Text style={s.signSub}>{clientDisplay}</Text>
            {data.clientCnpj && <Text style={s.signSub}>{data.clientCnpj}</Text>}
          </View>
        </View>

        <View style={s.signRow}>
          <View style={s.signBlock}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>TESTEMUNHA 01</Text>
            <Text style={s.signSub}>RG: ______________ CPF: ______________</Text>
          </View>
          <View style={s.signBlock}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>TESTEMUNHA 02</Text>
            <Text style={s.signSub}>RG: ______________ CPF: ______________</Text>
          </View>
        </View>

        <PageFooter />
      </Page>
    </Document>
  );
}
