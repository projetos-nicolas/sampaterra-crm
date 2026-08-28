/**
 * Camada livre de diagramação da proposta.
 *
 * Um elemento posicionado é a MESMA estrutura em dois lugares:
 *  - no editor (canvas HTML), onde é arrastado e redimensionado;
 *  - no PDF, onde vira um <View position="absolute"> do @react-pdf/renderer.
 *
 * Por isso as coordenadas estão sempre em PONTOS de PDF (A4 = 595,28 × 841,89),
 * nunca em pixels de tela: o zoom do editor é só uma escala de visualização.
 * Fonte única — quem precisar do tipo importa daqui, não redeclara.
 */

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;

/**
 * Onde a camada livre pode ser desenhada.
 *
 * Mantido só para os blocos automáticos saberem a que parte do documento
 * pertencem. A POSIÇÃO de um elemento livre é dada por `pageIndex` — a folha
 * física do PDF, contada de 1 — porque uma <Page> de conteúdo pode virar três
 * folhas quando o escopo é grande, e o usuário raciocina em folhas, não em
 * blocos lógicos.
 */
export type LayerPageKind =
  | "capa"
  | "institucional"
  | "conteudo"
  | "imagens"
  | "assinatura";

export type HighlightKind = "none" | "marker" | "box" | "bar" | "block";
export type ClipKind = "none" | "hex" | "circle";
export type FitKind = "cover" | "contain";
export type AlignKind = "left" | "center" | "right" | "justify";

interface BaseElement {
  id: string;
  /** Nome exibido na lista de camadas do editor. */
  name: string;
  /**
   * Folha física do PDF onde o elemento aparece, contada de 1.
   * Trocar este número MOVE o elemento de folha — é assim que um texto sai da
   * folha 3 e vai para a folha 2.
   */
  pageIndex: number;
  /**
   * Preenchido quando o elemento nasceu de um bloco do layout automático que
   * o usuário soltou. O renderizador usa `ProposalLayout.detached` para não
   * desenhar o bloco duas vezes.
   */
  sourceId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  hidden: boolean;
  /** Elemento do template: visível, mas protegido de arrasto acidental. */
  locked: boolean;
}

export interface TextElement extends BaseElement {
  kind: "text";
  text: string;
  size: number;
  weight: 400 | 500 | 600 | 700;
  color: string;
  letterSpacing: number;
  lineHeight: number;
  align: AlignKind;
  highlight: HighlightKind;
  italic?: boolean;
}

export interface ImageElement extends BaseElement {
  kind: "image";
  /**
   * A imagem como será desenhada — já com o recorte aplicado.
   *
   * O recorte é feito no editor, não no PDF: o @react-pdf não aceita máscara
   * SVG dentro da camada posicionada, então a alternativa é gravar a imagem
   * recortada. Também deixa o PDF mais leve.
   */
  src: string;
  /** A imagem como veio, para poder trocar o recorte sem perder qualidade. */
  srcOriginal?: string;
  clip: ClipKind;
  fit: FitKind;
  caption?: string;
}

export interface RectElement extends BaseElement {
  kind: "rect";
  fill: string;
  radius?: number;
}

export type LayoutElement = TextElement | ImageElement | RectElement;

/** O que fica gravado em `Proposal.pdfLayout`. */
export interface ProposalLayout {
  /** Versão do formato — permite migrar sem quebrar propostas antigas. */
  v: 1;
  elements: LayoutElement[];
  /**
   * Ids dos blocos do layout automático que viraram elementos editáveis.
   *
   * Isto é interno: o usuário não escolhe "soltar" nada. Ao abrir uma folha no
   * editor, todos os blocos dela são convertidos de uma vez — o fluxo
   * automático deixa de desenhá-los e a camada editável assume, na mesma
   * posição. Para quem usa, a folha simplesmente é editável.
   */
  detached: string[];
  /** Folhas já convertidas — evita refazer a conversão a cada abertura. */
  materialized?: number[];
}

export const EMPTY_LAYOUT: ProposalLayout = { v: 1, elements: [], detached: [], materialized: [] };

/**
 * Identificadores estáveis dos blocos automáticos que podem ser soltos.
 * São strings fixas (não índices) para que soltar continue valendo depois de
 * reordenar ou renomear seções.
 */
export const AUTO_BLOCKS = {
  capaTitulo: "auto:capa:titulo",
  capaSubtitulo: "auto:capa:subtitulo",
  capaLogo: "auto:capa:logo",
  instQuemSomos: "auto:inst:quemsomos",
  instQuemSomosTxt1: "auto:inst:quemsomos:p1",
  instQuemSomosTxt2: "auto:inst:quemsomos:p2",
  instServicos: "auto:inst:servicos",
  instServicosTxt: "auto:inst:servicos:p1",
  instHexGrid: "auto:inst:hexgrid",
  instHero: "auto:inst:hero",
  contClienteBox: "auto:cont:cliente",
  contPagamento: "auto:cont:pagamento",
  assinaturas: "auto:assin:blocos",
} as const;

/** Bloco de seção dinâmica: o id carrega o id da seção. */
export const secaoBlockId = (sectionId: string) => `auto:cont:secao:${sectionId}`;

export function isDetached(layout: ProposalLayout | null | undefined, blockId: string): boolean {
  return !!layout?.detached?.includes(blockId);
}

/**
 * Lê o JSON vindo do banco com desconfiança: proposta antiga não tem layout,
 * e um layout corrompido não pode derrubar a geração do PDF.
 */
export function parseLayout(raw: unknown): ProposalLayout {
  if (!raw || typeof raw !== "object") return EMPTY_LAYOUT;
  const obj = raw as any;
  if (obj.v !== 1 || !Array.isArray(obj.elements)) return EMPTY_LAYOUT;
  const detached = Array.isArray(obj.detached)
    ? obj.detached.filter((d: any) => typeof d === "string")
    : [];
  const elements = obj.elements.filter(
    (e: any) =>
      e &&
      typeof e.id === "string" &&
      ["text", "image", "rect"].includes(e.kind) &&
      Number.isFinite(e.x) &&
      Number.isFinite(e.y) &&
      Number.isFinite(e.w) &&
      Number.isFinite(e.h) &&
      Number.isFinite(e.pageIndex)
  );
  const materialized = Array.isArray(obj.materialized)
    ? obj.materialized.filter((n: any) => Number.isFinite(n))
    : [];
  return { v: 1, elements, detached, materialized };
}

/** Só os elementos de uma folha física, já na ordem de empilhamento. */
export function elementsFor(layout: ProposalLayout, pageIndex: number): LayoutElement[] {
  return layout.elements.filter((e) => e.pageIndex === pageIndex);
}

export function newId(): string {
  return "el_" + Math.random().toString(36).slice(2, 10);
}

// ── Fábricas usadas pelos botões do editor ───────────────────────────────────

export function makeText(
  pageIndex: number,
  patch: Partial<TextElement> = {}
): TextElement {
  return {
    id: newId(),
    name: "Novo texto",
    pageIndex,
    x: 60,
    y: 300,
    w: 240,
    h: 26,
    opacity: 1,
    hidden: false,
    locked: false,
    kind: "text",
    text: "Escreva aqui",
    size: 11,
    weight: 400,
    color: "#1A1A1A",
    letterSpacing: 0,
    lineHeight: 1.5,
    align: "left",
    highlight: "none",
    ...patch,
  };
}

export function makeImage(
  pageIndex: number,
  src: string,
  patch: Partial<ImageElement> = {}
): ImageElement {
  return {
    id: newId(),
    name: "Nova foto",
    pageIndex,
    x: 60,
    y: 300,
    w: 160,
    h: 160,
    opacity: 1,
    hidden: false,
    locked: false,
    kind: "image",
    src,
    clip: "none",
    fit: "cover",
    ...patch,
  };
}

export function makeRect(
  pageIndex: number,
  patch: Partial<RectElement> = {}
): RectElement {
  return {
    id: newId(),
    name: "Forma",
    pageIndex,
    x: 60,
    y: 300,
    w: 120,
    h: 4,
    opacity: 1,
    hidden: false,
    locked: false,
    kind: "rect",
    fill: "#E8571A",
    ...patch,
  };
}
