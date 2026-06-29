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
 * Logo oficial da Sampa Terra (ícone de escavadeira + wordmark "SAMPA"),
 * arquivo em /public/logo-sampaterra.png. A imagem é preta sobre fundo
 * transparente; em variantes "sobre fundo escuro" aplicamos um filtro CSS
 * (invert) para deixar o desenho branco e legível sobre o fundo escuro,
 * sem precisar de um segundo arquivo de imagem.
 */
export function SampaTerraLogo({
  variant = "azul-quadrado",
  height = 48,
  className = "",
}: SampaTerraLogoProps) {
  const onDark = variant === "azul-quadrado" || variant === "texto-branco";

  return (
    <img
      src="/logo-sampaterra.png"
      alt="Sampa Terra"
      className={`flex-shrink-0 object-contain ${className}`}
      style={{
        height,
        width: "auto",
        filter: onDark ? "invert(1) brightness(1.1)" : "none",
      }}
    />
  );
}
