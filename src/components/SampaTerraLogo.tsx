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
 * Logo oficial da Sampa Terra — versão amarela sobre fundo escuro.
 * Arquivo: /public/logo amarelo sampa.jpeg
 */
export function SampaTerraLogo({
  variant = "azul-quadrado",
  height = 56,
  className = "",
}: SampaTerraLogoProps) {
  return (
    <img
      src="/logo-sampa-amarelo.jpeg"
      alt="Sampa Terra"
      className={`flex-shrink-0 object-contain ${className}`}
      style={{
        height,
        width: "auto",
      }}
    />
  );
}
