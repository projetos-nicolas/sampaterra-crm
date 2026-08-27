import React from "react";
import {
  View,
  Text,
  Image as PDFImage,
  Svg,
  Defs,
  ClipPath,
  Polygon,
} from "@react-pdf/renderer";
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
  // `contain` mantém a foto inteira; `cover` preenche a caixa. O @react-pdf
  // usa objectFit, igual ao CSS.
  const fit = e.fit === "contain" ? "contain" : "cover";

  if (e.clip === "none") {
    return (
      <PDFImage
        src={e.src}
        style={{ width: e.w, height: e.h, objectFit: fit }}
      />
    );
  }

  // Hexágono e círculo saem por clip SVG — mesma técnica do HexImage do
  // template, generalizada para caixas retangulares.
  const id = "clip_" + e.id.replace(/[^a-zA-Z0-9]/g, "");
  const pts =
    e.clip === "hex"
      ? [
          [e.w * 0.5, 0],
          [e.w, e.h * 0.25],
          [e.w, e.h * 0.75],
          [e.w * 0.5, e.h],
          [0, e.h * 0.75],
          [0, e.h * 0.25],
        ]
      : // círculo aproximado por polígono de 32 lados — evita depender de
        // <Circle> dentro de ClipPath, que nem toda versão do react-pdf aceita
        Array.from({ length: 32 }, (_, i) => {
          const a = (i / 32) * Math.PI * 2;
          return [e.w / 2 + (e.w / 2) * Math.cos(a), e.h / 2 + (e.h / 2) * Math.sin(a)];
        });

  return (
    <Svg width={e.w} height={e.h} viewBox={`0 0 ${e.w} ${e.h}`}>
      <Defs>
        <ClipPath id={id}>
          <Polygon points={pts.map(([x, y]) => `${x},${y}`).join(" ")} />
        </ClipPath>
      </Defs>
      <PDFImage
        src={e.src}
        // @ts-ignore — x/y/clipPath são válidos dentro de <Svg>, os tipos do
        // @react-pdf não expõem (mesma supressão já usada em HexImage)
        x={0}
        y={0}
        width={e.w}
        height={e.h}
        clipPath={`url(#${id})`}
      />
    </Svg>
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
export function LayoutLayer({ layout }: { layout?: ProposalLayout | null }) {
  if (!layout?.elements?.length) return null;

  return (
    <View
      fixed
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
