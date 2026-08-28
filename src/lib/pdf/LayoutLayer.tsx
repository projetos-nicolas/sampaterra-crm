import React from "react";
import { View, Text, Image as PDFImage } from "@react-pdf/renderer";
import {
  elementsFor,
  type LayoutElement,
  type ProposalLayout,
  type TextElement,
  type ImageElement,
  type RectElement,
} from "./layout";

/**
 * Desenha a camada livre por cima de uma página do PDF.
 *
 * Cada elemento vira um <View position="absolute"> nas mesmas coordenadas em
 * que o usuário o largou no editor — por isso o editor e o PDF trabalham em
 * pontos, não em pixels. Elementos ocultos não são renderizados.
 *
 * Este componente é sempre o ÚLTIMO filho da <Page>: o que o usuário
 * posiciona fica por cima do conteúdo automático, nunca por baixo dele.
 */

const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const FONT_OBLIQUE = "Helvetica-Oblique";
const FONT_BOLD_OBLIQUE = "Helvetica-BoldOblique";

function pickFont(e: TextElement): string {
  const bold = e.weight >= 600;
  if (bold && e.italic) return FONT_BOLD_OBLIQUE;
  if (bold) return FONT_BOLD;
  if (e.italic) return FONT_OBLIQUE;
  return FONT;
}

/** Cores dos destaques — as mesmas do editor, para o que se vê ser o que sai. */
const HI_MARKER = "#FBDF8B";
const HI_ACCENT = "#E8571A";
const HI_BLOCK_BG = "#14130E";

function TextEl({ e }: { e: TextElement }) {
  const font = pickFont(e);
  const base = {
    fontFamily: font,
    fontSize: e.size,
    color: e.highlight === "block" ? "#FFFFFF" : e.color,
    letterSpacing: e.letterSpacing,
    lineHeight: e.lineHeight,
    textAlign: e.align,
  } as const;

  // Marca-texto: uma faixa atrás da linha. O @react-pdf não tem background
  // parcial em Text, então a faixa é um retângulo posicionado atrás.
  if (e.highlight === "marker") {
    return (
      <View style={{ position: "relative" }}>
        <View
          style={{
            position: "absolute",
            left: -2,
            right: -2,
            // A faixa cobre a metade inferior da caixa de texto, como um
            // marca-texto passado por cima da linha — não uma tarja embaixo.
            top: e.size * 0.34,
            height: e.size * 0.74,
            backgroundColor: HI_MARKER,
          }}
        />
        <Text style={base}>{e.text}</Text>
      </View>
    );
  }

  if (e.highlight === "box") {
    return (
      <View
        style={{
          borderWidth: 1.4,
          borderColor: HI_ACCENT,
          paddingVertical: 5,
          paddingHorizontal: 7,
        }}
      >
        <Text style={base}>{e.text}</Text>
      </View>
    );
  }

  if (e.highlight === "bar") {
    return (
      <View style={{ borderLeftWidth: 3, borderLeftColor: HI_ACCENT, paddingLeft: 9, paddingVertical: 2 }}>
        <Text style={base}>{e.text}</Text>
      </View>
    );
  }

  if (e.highlight === "block") {
    return (
      <View style={{ backgroundColor: HI_BLOCK_BG, paddingVertical: 6, paddingHorizontal: 9 }}>
        <Text style={base}>{e.text}</Text>
      </View>
    );
  }

  return <Text style={base}>{e.text}</Text>;
}

function ImageEl({ e }: { e: ImageElement }) {
  // O recorte (hexágono, círculo) já vem embutido na imagem — feito no editor
  // por canvas, porque o @react-pdf não aceita máscara SVG dentro da camada
  // posicionada. Aqui é só desenhar.
  return (
    <PDFImage
      src={e.src}
      style={{ width: e.w, height: e.h, objectFit: e.fit === "contain" ? "contain" : "cover" }}
    />
  );
}

function RectEl({ e }: { e: RectElement }) {
  return (
    <View
      style={{
        width: e.w,
        height: e.h,
        backgroundColor: e.fill,
        borderRadius: e.radius ?? 0,
      }}
    />
  );
}

function Element({ e }: { e: LayoutElement }) {
  if (e.hidden) return null;
  return (
    <View
      style={{
        position: "absolute",
        left: e.x,
        top: e.y,
        width: e.w,
        height: e.h,
        opacity: e.opacity,
      }}
    >
      {e.kind === "text" ? (
        <TextEl e={e} />
      ) : e.kind === "image" ? (
        <ImageEl e={e} />
      ) : (
        <RectEl e={e} />
      )}
    </View>
  );
}

/**
 * Ancorar por FOLHA FÍSICA.
 *
 * Uma <Page> com muito conteúdo vira várias folhas, e o layout engine decide
 * onde quebrar — então não dá para saber de fora em qual folha um elemento
 * cai. A saída é `fixed` + `render`: o @react-pdf chama a função uma vez por
 * folha gerada, informando o `pageNumber` do documento. Desenhamos só o que
 * pertence àquela folha.
 *
 * Por isso este componente entra em TODAS as <Page> do documento: cada uma
 * cobre as folhas que ela mesma gerou, e o filtro por número faz o resto.
 */
export function LayoutLayer({
  layout,
  padTop = 0,
  padLeft = 0,
}: {
  layout?: ProposalLayout | null;
  /**
   * Recuo da <Page>. As coordenadas dos elementos são medidas a partir do
   * CANTO DA FOLHA, mas um filho posicionado dentro de uma Page com padding
   * tem origem na área de conteúdo. Sem compensar, tudo escorrega para dentro
   * — e um elemento no rodapé acaba fora da folha.
   */
  padTop?: number;
  padLeft?: number;
}) {
  if (!layout?.elements?.length) return null;

  return (
    <View
      fixed
      // A camada cobre a folha inteira e vira a referência dos filhos
      // absolutos. Sem isto ela seria só mais um bloco no fim do fluxo, e os
      // elementos ficariam ancorados onde o fluxo terminou.
      style={{
        position: "absolute",
        top: -padTop,
        left: -padLeft,
        width: 595.28,
        height: 841.89,
      }}
      render={({ pageNumber }: { pageNumber: number }) => {
        const items = elementsFor(layout, pageNumber);
        if (!items.length) return null;
        return (
          <>
            {items.map((e) => (
              <Element key={e.id} e={e} />
            ))}
          </>
        );
      }}
    />
  );
}
