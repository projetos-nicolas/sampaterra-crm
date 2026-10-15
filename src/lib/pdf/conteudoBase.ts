/**
 * Conteúdo base das propostas da Sampa Terra.
 *
 * Os textos aqui são os que saem por padrão em toda proposta nova. Foram
 * extraídos da PROP-2026-286 (Demolição), que é a proposta de referência —
 * antes o padrão vinha de um modelo de engenharia estrutural (ART/RRT,
 * NBR 6118, TQS/Eberick), herdado de outro projeto e que precisava ser
 * reescrito à mão em toda proposta.
 *
 * Este módulo também é a base do modelo padrão em "Modelos de Proposta":
 * se não houver nenhum modelo salvo, é daqui que o sistema parte.
 */

import type { SecaoModelo } from "./pdfConfig";

/** Texto do objetivo do contrato. */
export const OBJETIVO_BASE =
  "O objeto da presente proposta é a execução dos serviços descritos no escopo " +
  "abaixo, com o fornecimento de equipamentos, operadores e equipe própria da " +
  "CONTRATADA, conforme as condições detalhadas neste instrumento.";

/** Metodologia padrão — ajustável por proposta. */
export const METODOLOGIA_BASE =
  "Execução dos serviços com equipamentos mecanizados e ferramentas hidráulicas " +
  "(escavadeiras, retroescavadeiras e afins), conduzida por operadores " +
  "qualificados e equipe própria, observando as normas de segurança do trabalho " +
  "aplicáveis e a preservação das estruturas e divisas vizinhas.";

/** Obrigações do contratante. */
export const OBRIGACOES_CONTRATANTE_BASE = [
  "Fornecer todas as informações técnicas necessárias",
  "Efetuar os pagamentos nas condições estabelecidas",
  "Informar previamente qualquer alteração de escopo",
].map((l) => "- " + l).join("\n");

/** Obrigações da contratada. */
export const OBRIGACOES_CONTRATADA_BASE = [
  "Executar os serviços com qualidade técnica e dentro do prazo acordado",
  "Disponibilizar equipamentos em condições de uso e operadores habilitados",
  "Manter sigilo sobre informações confidenciais do CONTRATANTE",
].map((l) => "- " + l).join("\n");

/** Vigência da proposta. */
export const VIGENCIA_BASE =
  "A presente proposta tem validade de 30 (trinta) dias corridos a partir da " +
  "data de sua emissão.";

/** Multas, inadimplemento e rescisão. */
export const MULTAS_BASE =
  "O não pagamento nas datas acordadas ensejará multa de 2% sobre o valor em " +
  "atraso, acrescida de juros de 1% ao mês. A rescisão antecipada por parte do " +
  "CONTRATANTE implica o pagamento dos serviços já realizados, acrescidos de " +
  "20% a título de perdas e danos.";

/** Foro de eleição. */
export const FORO_BASE =
  "As partes elegem o Foro da Comarca de Diadema - SP para dirimir quaisquer " +
  "dúvidas ou litígios oriundos do presente instrumento.";

/**
 * Condições gerais da obra — as nove cláusulas operacionais da Sampa Terra.
 * Antes precisavam ser digitadas manualmente em cada proposta.
 */
export const CONDICOES_GERAIS_BASE = [
  "O atraso do pagamento poderá acarretar a paralisação da obra;",
  "Caso a máquina seja utilizada para outros fins, será cobrada a diária referente à mesma;",
  "Será cobrada a diária da máquina parada caso o topógrafo da contratante não compareça nos dias seguintes à medição;",
  "O horário de serviço será das 7h00 às 17h00;",
  "Documentações relacionadas à liberação da obra deverão ser fornecidas pelo cliente;",
  "O prazo de execução pode ser alterado devido a intempéries como chuva forte e similares;",
  "O proprietário deverá disponibilizar pelo menos uma pessoa responsável para ficar na obra;",
  "Água e luz deverão ser fornecidas pelo contratante;",
  "Caso a máquina fique parada por falta de material, será cobrada meia diária.",
]
  .map((l, i) => `${i + 1}. ${l}`)
  .join("\n");

/** Prazo de execução — fica desligado por padrão, como na proposta de referência. */
export const PRAZOS_BASE =
  "O prazo de execução será definido em comum acordo entre as partes após a " +
  "liberação da obra, podendo ser alterado por intempéries ou por fatos " +
  "alheios à CONTRATADA.";

/**
 * As seções padrão, na ordem em que saem no PDF.
 *
 * `enabled: false` deixa a seção disponível na lista do editor, mas fora do
 * PDF — é o caso de "Prazos", que a proposta de referência não traz.
 */
export function secoesBase(): SecaoModelo[] {
  return [
    {
      id: "objetivo",
      title: "Objetivo do Contrato",
      content: OBJETIVO_BASE,
      type: "text",
      enabled: true,
      pageBreakBefore: false,
    },
    {
      id: "escopo",
      title: "Detalhamento do Escopo",
      // Preenchido com os itens da proposta na hora de abrir o editor.
      content: "",
      type: "text",
      enabled: true,
      pageBreakBefore: false,
    },
    {
      id: "metodologia",
      title: "Metodologia e Diretrizes Técnicas",
      content: METODOLOGIA_BASE,
      type: "text",
      enabled: true,
      pageBreakBefore: false,
    },
    {
      id: "prazos",
      title: "Prazos",
      content: PRAZOS_BASE,
      type: "text",
      enabled: false,
      pageBreakBefore: false,
    },
    {
      id: "pagamento",
      title: "Investimento e Pagamento",
      content: "",
      type: "pagamento",
      enabled: true,
      pageBreakBefore: false,
    },
    {
      id: "obrig_contratante",
      title: "Obrigações do Contratante",
      content: OBRIGACOES_CONTRATANTE_BASE,
      type: "text",
      enabled: true,
      pageBreakBefore: false,
    },
    {
      id: "obrig_contratada",
      title: "Obrigações da Contratada",
      content: OBRIGACOES_CONTRATADA_BASE,
      type: "text",
      enabled: true,
      pageBreakBefore: false,
    },
    {
      id: "vigencia",
      title: "Vigência da Proposta",
      content: VIGENCIA_BASE,
      type: "text",
      enabled: true,
      pageBreakBefore: false,
    },
    {
      id: "multas",
      title: "Multas, Inadimplemento e Rescisão",
      content: MULTAS_BASE,
      type: "text",
      enabled: true,
      pageBreakBefore: false,
    },
    {
      id: "foro",
      title: "Foro de Eleição",
      content: FORO_BASE,
      type: "text",
      enabled: true,
      pageBreakBefore: false,
    },
    {
      id: "condicoes_gerais",
      title: "Condições Gerais",
      content: CONDICOES_GERAIS_BASE,
      type: "text",
      enabled: true,
      pageBreakBefore: false,
    },
  ];
}

/** Condições de pagamento que aparecem acima da tabela de parcelas. */
export const CONDICOES_PAGAMENTO_BASE = "A COMBINAR";
