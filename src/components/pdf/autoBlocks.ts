import {
  AUTO_BLOCKS,
  secaoBlockId,
  makeText,
  makeImage,
  type LayoutElement,
} from "@/lib/pdf/layout";

/**
 * Catálogo dos blocos que o layout automático monta e que podem ser soltos.
 *
 * Cada entrada sabe fabricar o elemento livre equivalente — mesma posição,
 * mesmo texto e mesmo estilo que o bloco tinha no fluxo. Assim, soltar não
 * muda nada visualmente: o bloco só passa a ser arrastável.
 *
 * As coordenadas espelham os estilos de PropostaPDF.tsx. Se aquele arquivo
 * mudar de medidas, estas precisam acompanhar — é o preço de manter as duas
 * representações.
 */

/** A que parte do documento o bloco pertence — usado para achar a folha. */
export type DocPart = "capa" | "institucional" | "conteudo" | "assinatura";

export interface AutoBlockDef {
  id: string;
  label: string;
  part: DocPart;
  make: (ctx: AutoBlockContext) => LayoutElement;
}

export interface AutoBlockContext {
  /** Folha física onde o bloco solto deve nascer. */
  pageIndex: number;
  /** Quantos blocos já foram soltos nessa folha — evita empilhar no mesmo ponto. */
  offsetIndex?: number;
  text?: string;
  title?: string;
  heroSrc?: string;
}

const BODY_TXT = {
  size: 9.6,
  weight: 400 as const,
  color: "#1A1A1A",
  letterSpacing: 0,
  lineHeight: 1.85,
};
const H1_TXT = {
  size: 22,
  weight: 700 as const,
  color: "#1A1A1A",
  letterSpacing: 0.3,
  lineHeight: 1.15,
};

export const AUTO_BLOCK_DEFS: AutoBlockDef[] = [
  {
    id: AUTO_BLOCKS.instQuemSomos,
    label: "Título · Quem Somos",
    part: "institucional",
    make: (ctx) =>
      makeText(ctx.pageIndex, {
        name: "Título · Quem Somos",
        sourceId: AUTO_BLOCKS.instQuemSomos,
        x: 50, y: 96, w: 250, h: 30,
        text: "QUEM SOMOS",
        ...H1_TXT,
      }),
  },
  {
    id: AUTO_BLOCKS.instQuemSomosTxt1,
    label: "Parágrafo · institucional",
    part: "institucional",
    make: (ctx) =>
      makeText(ctx.pageIndex, {
        name: "Parágrafo · institucional",
        sourceId: AUTO_BLOCKS.instQuemSomosTxt1,
        x: 50, y: 130, w: 250, h: 72,
        text:
          "A Sampa Terra é referência no mercado em terraplanagem e locação de máquinas, contando com equipamentos modernos e operadores qualificados, garantindo uma execução rápida, segura e eficiente em cada projeto.",
        ...BODY_TXT,
      }),
  },
  {
    id: AUTO_BLOCKS.instQuemSomosTxt2,
    label: "Parágrafo · frota própria",
    part: "institucional",
    make: (ctx) =>
      makeText(ctx.pageIndex, {
        name: "Parágrafo · frota própria",
        sourceId: AUTO_BLOCKS.instQuemSomosTxt2,
        x: 50, y: 208, w: 250, h: 72,
        text:
          "Atuamos com frota própria e equipe especializada, prontos para atender construtoras e investidores com agilidade na entrega e compromisso total com o resultado final de cada obra.",
        ...BODY_TXT,
      }),
  },
  {
    id: AUTO_BLOCKS.instServicos,
    label: "Título · Nossos Serviços",
    part: "institucional",
    make: (ctx) =>
      makeText(ctx.pageIndex, {
        name: "Título · Nossos Serviços",
        sourceId: AUTO_BLOCKS.instServicos,
        x: 50, y: 296, w: 280, h: 30,
        text: "NOSSOS SERVIÇOS",
        ...H1_TXT,
      }),
  },
  {
    id: AUTO_BLOCKS.instServicosTxt,
    label: "Parágrafo · serviços",
    part: "institucional",
    make: (ctx) =>
      makeText(ctx.pageIndex, {
        name: "Parágrafo · serviços",
        sourceId: AUTO_BLOCKS.instServicosTxt,
        x: 50, y: 330, w: 250, h: 56,
        text:
          "Da terraplanagem à demolição, oferecemos a máquina e o operador certos para cada etapa da obra — com equipamentos modernos e equipe própria qualificada.",
        ...BODY_TXT,
      }),
  },
  {
    id: AUTO_BLOCKS.instHero,
    label: "Foto grande do topo",
    part: "institucional",
    make: (ctx) =>
      makeImage(ctx.pageIndex, ctx.heroSrc ?? "", {
        name: "Foto grande do topo",
        sourceId: AUTO_BLOCKS.instHero,
        x: 325, y: 56, w: 220, h: 220,
        clip: "hex",
        fit: "cover",
      }),
  },
  {
    id: AUTO_BLOCKS.contClienteBox,
    label: "Quadro · Dados do Cliente",
    part: "conteudo",
    make: (ctx) =>
      makeText(ctx.pageIndex, {
        name: "Quadro · Dados do Cliente",
        sourceId: AUTO_BLOCKS.contClienteBox,
        x: 50, y: 110, w: 495, h: 120,
        text: ctx.text ?? "Dados do Cliente",
        size: 8.5,
        weight: 400,
        color: "#1A1A1A",
        letterSpacing: 0,
        lineHeight: 1.7,
      }),
  },
];

/** Def de uma seção dinâmica — criada sob demanda a partir da seção real. */
export function sectionBlockDef(section: { id: string; title: string; content: string }, index: number): AutoBlockDef {
  return {
    id: secaoBlockId(section.id),
    label: `${index + 1}. ${section.title}`,
    part: "conteudo",
    make: (ctx) =>
      makeText(ctx.pageIndex, {
        name: section.title,
        sourceId: secaoBlockId(section.id),
        // Escalona para não empilhar todos no mesmo ponto
        x: 50 + (ctx.offsetIndex ?? 0) * 10,
        y: 120 + (ctx.offsetIndex ?? 0) * 26,
        w: 495, h: 120,
        text: `${section.title}\n\n${section.content}`,
        size: 8.8,
        weight: 400,
        color: "#1A1A1A",
        letterSpacing: 0,
        lineHeight: 1.65,
      }),
  };
}
