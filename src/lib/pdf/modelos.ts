/**
 * Modelos de proposta.
 *
 * Um modelo é um "PDF padrão" salvo: as seções com seus textos, o modo de
 * exibição de valores, as condições de pagamento, os dados bancários e, se
 * houver, a camada livre de diagramação. Toda proposta nova nasce a partir
 * do modelo marcado como padrão.
 *
 * O que NÃO entra num modelo: nada que seja do cliente ou da obra
 * (nome, endereço, parcelas com valor, imagens da proposta). Modelo é forma,
 * não conteúdo de um negócio específico.
 */

import type { ExibicaoValores, BankInfoConfig } from "./pdfConfig";
import { parseSecoes, type SecaoModelo } from "./pdfConfig";
import { parseLayout, EMPTY_LAYOUT, type ProposalLayout } from "./layout";

export type { SecaoModelo };
export { parseSecoes };

export interface ConteudoModelo {
  /** Versão do formato — permite migrar sem quebrar modelos antigos. */
  v: 1;
  secoes: SecaoModelo[];
  exibicaoValores: ExibicaoValores;
  /** Texto livre acima da tabela de parcelas (ex.: "A COMBINAR"). */
  paymentNotes: string;
  bankInfo?: BankInfoConfig;
  /** Camada livre de diagramação aplicada junto com o modelo. */
  layout?: ProposalLayout;
}

export function parseConteudoModelo(raw: unknown): ConteudoModelo | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as any;
  const secoes = parseSecoes(o.secoes);
  if (!secoes) return null;
  return {
    v: 1,
    secoes,
    exibicaoValores: ["completo", "sem_total", "sem_valores"].includes(o.exibicaoValores)
      ? o.exibicaoValores
      : "completo",
    paymentNotes: typeof o.paymentNotes === "string" ? o.paymentNotes : "",
    bankInfo:
      o.bankInfo && typeof o.bankInfo === "object"
        ? {
            banco: String(o.bankInfo.banco ?? ""),
            empresa: String(o.bankInfo.empresa ?? ""),
            cnpj: String(o.bankInfo.cnpj ?? ""),
            agencia: String(o.bankInfo.agencia ?? ""),
            conta: String(o.bankInfo.conta ?? ""),
          }
        : undefined,
    layout: o.layout ? parseLayout(o.layout) : EMPTY_LAYOUT,
  };
}
