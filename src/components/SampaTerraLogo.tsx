interface SampaTerraLogoProps {
  /**
   * Qual variação de cor usar:
   * "azul-quadrado"  → ícone âmbar sobre fundo escuro (sidebar, login) — nome mantido por
   *                    compatibilidade com o componente original, mas a cor real é âmbar/preto
   * "laranja"        → ícone preto sobre fundo âmbar
   * "texto-branco"   → só wordmark, texto branco
   * "texto-escuro"   → só wordmark, texto escuro
   */
  variant?: "azul-quadrado" | "laranja" | "texto-branco" | "texto-escuro";
  /** Altura em px (largura é automática) */
  height?: number;
  className?: string;
}

/**
 * Logo provisório da Sampa Terra — wordmark + ícone simplificado de escavadeira,
 * construído em SVG (sem depender de arquivo de imagem). Quando o arquivo de
 * logo oficial estiver disponível, basta substituir este componente por um
 * <Image> apontando para o PNG/SVG definitivo em /public.
 */
export function SampaTerraLogo({
  variant = "azul-quadrado",
  height = 48,
  className = "",
}: SampaTerraLogoProps) {
  const onDark = variant === "azul-quadrado" || variant === "texto-branco";
  const iconBg = variant === "laranja" ? "#F5A623" : "transpar