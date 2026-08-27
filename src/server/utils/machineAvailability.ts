import type { PrismaClient } from "@prisma/client";

/**
 * Fonte única da verdade sobre a ocupação de uma máquina.
 *
 * O campo `Machine.status` deixou de ser digitado à mão: ele é DERIVADO das
 * locações e das manutenções imobilizantes que cobrem a data de referência.
 * Só `inativa` continua sendo uma decisão manual (máquina vendida, sucateada
 * ou fora de operação), representada por `Machine.active = false`.
 *
 * Assim, registrar uma locação já muda o status em todas as telas sem que
 * ninguém precise lembrar de atualizar nada.
 */

export type DerivedStatus = "disponivel" | "em_locacao" | "em_manutencao" | "inativa";

export interface PeriodConflict {
  kind: "locacao" | "manutencao";
  id: string;
  label: string;
  startDate: Date;
  endDate: Date | null;
  detail?: string;
}

/** Duas faixas se sobrepõem? `end` nulo = em aberto (sem previsão de término). */
export function overlaps(
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date | null
): boolean {
  const aEndOk = aEnd == null || aEnd.getTime() >= bStart.getTime();
  const bEndOk = bEnd == null || bEnd.getTime() >= aStart.getTime();
  return aEndOk && bEndOk;
}

/** Dias corridos entre duas datas, contando o dia inicial. Null-safe. */
export function daysBetween(start: Date, end: Date | null): number | null {
  if (!end) return null;
  const MS = 24 * 60 * 60 * 1000;
  const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const b = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(0, Math.round((b - a) / MS)) + 1;
}

/**
 * Deriva o status a partir dos registros já carregados.
 */
export function deriveStatus(opts: {
  active: boolean;
  hasActiveRental: boolean;
  hasBlockingMaintenance: boolean;
}): DerivedStatus {
  if (!opts.active) return "inativa";
  // Manutenção tem precedência: máquina na oficina não está trabalhando,
  // mesmo que exista uma locação registrada sobrepondo o período.
  if (opts.hasBlockingMaintenance) return "em_manutencao";
  if (opts.hasActiveRental) return "em_locacao";
  return "disponivel";
}

/**
 * Busca tudo que ocupa uma máquina num período — usado tanto para o aviso de
 * conflito ao criar/editar locação quanto para a checagem sob demanda na tela.
 *
 * `ignoreRentalId` evita que uma locação seja considerada conflitante consigo
 * mesma durante a edição.
 */
export async function findConflicts(
  prisma: PrismaClient,
  args: {
    machineId: string;
    startDate: Date;
    endDate: Date | null;
    ignoreRentalId?: string;
    ignoreMaintenanceId?: string;
  }
): Promise<PeriodConflict[]> {
  const { machineId, startDate, endDate } = args;
  const conflicts: PeriodConflict[] = [];

  // ── Locações sobrepostas ───────────────────────────────────────────────────
  const rentals = await prisma.machineRental.findMany({
    where: {
      machineId,
      ...(args.ignoreRentalId ? { id: { not: args.ignoreRentalId } } : {}),
      ...(endDate ? { startDate: { lte: endDate } } : {}),
      endDate: { gte: startDate },
    },
    include: { client: { select: { name: true, company: true } } },
    orderBy: { startDate: "asc" },
  });

  for (const r of rentals) {
    if (!overlaps(startDate, endDate, r.startDate, r.endDate)) continue;
    const cliente = r.client?.company || r.client?.name;
    conflicts.push({
      kind: "locacao",
      id: r.id,
      label: r.title,
      startDate: r.startDate,
      endDate: r.endDate,
      detail: [cliente, r.location].filter(Boolean).join(" · ") || undefined,
    });
  }

  // ── Manutenções imobilizantes sobrepostas ──────────────────────────────────
  const maintenances = await prisma.machineMaintenance.findMany({
    where: {
      machineId,
      immobilizes: true,
      ...(args.ignoreMaintenanceId ? { id: { not: args.ignoreMaintenanceId } } : {}),
      ...(endDate ? { date: { lte: endDate } } : {}),
      OR: [{ endDate: null }, { endDate: { gte: startDate } }],
    },
    orderBy: { date: "asc" },
  });

  for (const m of maintenances) {
    if (!overlaps(startDate, endDate, m.date, m.endDate)) continue;
    conflicts.push({
      kind: "manutencao",
      id: m.id,
      label: m.description,
      startDate: m.date,
      endDate: m.endDate,
      detail: m.performedBy || undefined,
    });
  }

  return conflicts;
}

/**
 * Anexa o status derivado a uma máquina já carregada com as relações
 * `rentals` e `maintenances`.
 */
export function attachDerivedStatus<
  T extends {
    active: boolean;
    rentals?: Array<{ startDate: Date; endDate: Date }>;
    maintenances?: Array<{ date: Date; endDate: Date | null; immobilizes: boolean }>;
  }
>(machine: T, ref: Date): T & { status: DerivedStatus } {
  const hasActiveRental = (machine.rentals ?? []).some((r) =>
    overlaps(ref, ref, r.startDate, r.endDate)
  );
  const hasBlockingMaintenance = (machine.maintenances ?? []).some(
    (m) => m.immobilizes && overlaps(ref, ref, m.date, m.endDate)
  );
  return {
    ...machine,
    status: deriveStatus({ active: machine.active, hasActiveRental, hasBlockingMaintenance }),
  };
}
