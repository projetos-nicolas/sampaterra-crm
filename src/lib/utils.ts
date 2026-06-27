import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata valor monetário em BRL
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

/**
 * Formata data para exibição em pt-BR
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

/**
 * Calcula percentual recebido de um projeto (parcelas)
 */
export function calcReceivedPercent(received: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((received / total) * 100));
}

/**
 * Retorna label legível do status do lead
 */
export const LEAD_STATUS_LABELS: Record<string, string> = {
  contato_inicial: "Contato Inicial",
  visita_tecnica: "Visita Técnica",
  elaboracao_proposta: "Elaboração de Proposta",
  negociacao: "Negociação",
  fechado_ganho: "Fechado — Ganho",
  proposta_declinada: "Proposta Declinada",
  perdido: "Perdido",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  aguardando_inicio: "Aguardando Início",
  em_andamento: "Em Andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  parcial: "Parcial",
  atrasado: "Atrasado",
};
