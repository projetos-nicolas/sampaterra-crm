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
 * Logo oficial da Sampa Terra — versão editada, amarela sobre fundo escuro.
 * Arquivo: /public/logo-sampa-editado.png
 */
export function SampaTerraLogo({
  variant = "azul-quadrado",
  height = 80,
  className = "",
}: SampaTerraLogoProps) {
  return (
    <img
      src="/logo-sampa-editado.png"
      alt="Sampa Terra"
      className={`flex-shrink-0 object-contain ${className}`}
      style={{
        height,
        width: "auto",
      }}
    />
  );
}
