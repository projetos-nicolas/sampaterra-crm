import type { ClipKind } from "@/lib/pdf/layout";

/**
 * Aplica o recorte à imagem e devolve um PNG com transparência.
 *
 * O recorte acontece aqui, no navegador, e não na hora de gerar o PDF: o
 * @react-pdf não processa máscara SVG dentro da camada posicionada (o erro é
 * "SVG node of type CLIP_PATH is not currently supported"). Gravando a imagem
 * já recortada, o PDF só precisa desenhá-la — e o resultado é idêntico ao que
 * aparece na tela.
 *
 * A proporção da caixa entra no cálculo para o hexágono acompanhar imagens
 * que não são quadradas.
 */
export async function aplicarRecorte(
  src: string,
  clip: ClipKind,
  ladoW = 600,
  ladoH = 600
): Promise<string> {
  if (clip === "none") return src;

  const img = await new Promise<HTMLImageElement>((ok, err) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => err(new Error("Não consegui abrir a imagem para recortar."));
    i.src = src;
  });

  // Resolução do recorte proporcional à caixa, com teto para não pesar
  const escala = Math.min(1, 900 / Math.max(ladoW, ladoH));
  const W = Math.max(40, Math.round(ladoW / escala > 900 ? 900 : ladoW * 2));
  const H = Math.max(40, Math.round((W * ladoH) / ladoW));

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.beginPath();
  if (clip === "circle") {
    ctx.ellipse(W / 2, H / 2, W / 2, H / 2, 0, 0, Math.PI * 2);
  } else {
    // Hexágono de ponta para cima e para baixo — o mesmo do template
    const pts: [number, number][] = [
      [W * 0.5, 0],
      [W, H * 0.25],
      [W, H * 0.75],
      [W * 0.5, H],
      [0, H * 0.75],
      [0, H * 0.25],
    ];
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
  ctx.clip();

  // Preenche a área mantendo a proporção da foto (equivale a object-fit: cover)
  const r = Math.max(W / img.width, H / img.height);
  const dw = img.width * r;
  const dh = img.height * r;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

  return c.toDataURL("image/png");
}
