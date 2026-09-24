/**
 * Configuração de conteúdo do PDF da proposta.
 *
 * Diferente de `pdfLayout` (que guarda a diagramação — posições, textos
 * soltos, imagens), isto guarda DECISÕES sobre o que o documento mostra:
 * quanto de valor exibir, as condições de pagamento escritas à mão, o
 * endereço da obra e os dados bancários usados naquela proposta.
 *
 * Antes disso tudo era estado da tela e se perdia ao fechar o modal — o
 * usuário redigitava as condições de pagamento a cada vez.
 */

/** Quanto de valor o PDF mostra. */
export type ExibicaoValores =
  /** Frase com o valor, coluna Valor preenchida e faixa TOTAL. */
  | "completo"
  /** Sem a frase com o valor e sem a faixa TOTAL; parcelas mantêm os valores. */
  | "sem_total"
  /** Nenhum valor: a tabela vira só a lista de condições de pagamento. */
  | "sem_valores";

export const EXIBICAO_LABEL: Record<ExibicaoValores, string> = {
  completo: "Completo",
  sem_total: "Sem o total",
  sem_valores: "Sem valores",
};

export const EXIBICAO_AJUDA: Record<ExibicaoValores, string> = {
  completo: "Mostra o valor total na frase de abertura e na faixa TOTAL da tabela.",
  sem_total: "Esconde o total, mas cada parcela continua com seu valor — quem receber consegue somar.",
  sem_valores: "Nenhum valor aparece. A tabela fica só com as condições de pagamento.",
};

export interface BankInfoConfig {
  banco: string;
  empresa: string;
  cnpj: string;
  agencia: string;
  conta: string;
}

export interface ProposalPdfConfig {
  /** Versão do formato — permite migrar sem quebrar propostas antigas. */
  v: 1;
  exibicaoValores: ExibicaoValores;
  /** Texto livre acima da tabela de parcelas. */
  paymentNotes?: string;
  /** Endereço / localização do canteiro. */
  obraAddress?: string;
  bankInfo?: BankInfoConfig;
  /** Parcelas como o usuário montou. */
  pagamentos?: { descricao: string; valor: number; ordem: number }[];
}

export const DEFAULT_PDF_CONFIG: ProposalPdfConfig = {
  v: 1,
  exibicaoValores: "completo",
};

/**
 * Lê o JSON do banco com desconfiança: proposta antiga não tem config, e uma
 * config corrompida não pode derrubar a geração do PDF.
 */
export function parsePdfConfig(raw: unknown): ProposalPdfConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_PDF_CONFIG;
  const o = raw as any;
  const modo: ExibicaoValores = ["completo", "sem_total", "sem_valores"].includes(o.exibicaoValores)
    ? o.exibicaoValores
    : "completo";
  return {
    v: 1,
    exibicaoValores: modo,
    paymentNotes: typeof o.paymentNotes === "string" ? o.paymentNotes : undefined,
    obraAddress: typeof o.obraAddress === "string" ? o.obraAddress : undefined,
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
    pagamentos: Array.isArray(o.pagamentos)
      ? o.pagamentos
          .filter((p: any) => p && typeof p.descricao === "string")
          .map((p: any, i: number) => ({
            descricao: p.descricao,
            valor: Number(p.valor) || 0,
            ordem: Number.isFinite(p.ordem) ? p.ordem : i,
          }))
      : undefined,
  };
}
