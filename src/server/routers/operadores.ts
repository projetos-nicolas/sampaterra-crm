import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { daysBetween } from "../utils/machineAvailability";

// Só o nome é obrigatório — RG, CPF e cargo podem ser preenchidos depois.
const operatorUpsertSchema = z.object({
  name: z.string().min(1, "Informe o nome do operador."),
  rg: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/** Guarda apenas os dígitos — comparação de CPF ignora máscara. */
function onlyDigits(v?: string | null) {
  return (v ?? "").replace(/\D/g, "");
}

export const operadoresRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const operators = await ctx.prisma.operator.findMany({
        where: input?.includeInactive ? {} : { active: true },
        include: {
          _count: { select: { assignments: true, maintenances: true } },
          assignments: {
            orderBy: { startDate: "desc" },
            take: 3,
            include: {
              rental: {
                select: {
                  id: true,
                  title: true,
                  machine: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ active: "desc" }, { name: "asc" }],
      });

      return operators.map((o) => ({
        ...o,
        // Quantas máquinas distintas essa pessoa já operou
        totalRegistros: o._count.assignments + o._count.maintenances,
      }));
    }),

  /** Ficha completa: dados + todo o histórico de máquinas operadas. */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const operator = await ctx.prisma.operator.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          assignments: {
            orderBy: { startDate: "desc" },
            include: {
              rental: {
                select: {
                  id: true,
                  title: true,
                  location: true,
                  startDate: true,
                  endDate: true,
                  machine: { select: { id: true, name: true, plateOrCode: true } },
                  client: { select: { id: true, name: true, company: true } },
                },
              },
            },
          },
          maintenances: {
            orderBy: { date: "desc" },
            include: { machine: { select: { id: true, name: true } } },
          },
        },
      });

      // Consolidado por máquina: quantos dias no total em cada equipamento
      const porMaquina = new Map<
        string,
        { machineId: string; machineName: string; dias: number; locacoes: number }
      >();

      for (const a of operator.assignments) {
        const mid = a.rental.machine.id;
        const atual = porMaquina.get(mid) ?? {
          machineId: mid,
          machineName: a.rental.machine.name,
          dias: 0,
          locacoes: 0,
        };
        atual.dias += daysBetween(a.startDate, a.endDate) ?? 0;
        atual.locacoes += 1;
        porMaquina.set(mid, atual);
      }

      return {
        ...operator,
        maquinasOperadas: Array.from(porMaquina.values()).sort((a, b) => b.dias - a.dias),
        diasTotais: Array.from(porMaquina.values()).reduce((s, m) => s + m.dias, 0),
      };
    }),

  create: protectedProcedure
    .input(operatorUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const cpfDigits = onlyDigits(input.cpf);

      // Bloqueia duplicata silenciosa por CPF
      if (cpfDigits.length >= 11) {
        const existentes = await ctx.prisma.operator.findMany({
          where: { cpf: { not: null } },
          select: { id: true, name: true, cpf: true, active: true },
        });
        const dup = existentes.find((o) => onlyDigits(o.cpf) === cpfDigits);
        if (dup) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe um operador com esse CPF: ${dup.name}${
              dup.active ? "" : " (inativo — reative em vez de cadastrar de novo)"
            }.`,
          });
        }
      }

      return ctx.prisma.operator.create({
        data: {
          name: input.name.trim(),
          rg: input.rg?.trim() || null,
          cpf: input.cpf?.trim() || null,
          role: input.role?.trim() || null,
          phone: input.phone?.trim() || null,
          notes: input.notes?.trim() || null,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: operatorUpsertSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const cpfDigits = onlyDigits(input.data.cpf);
      if (cpfDigits.length >= 11) {
        const existentes = await ctx.prisma.operator.findMany({
          where: { cpf: { not: null }, id: { not: input.id } },
          select: { id: true, name: true, cpf: true },
        });
        const dup = existentes.find((o) => onlyDigits(o.cpf) === cpfDigits);
        if (dup) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Esse CPF já está cadastrado para ${dup.name}.`,
          });
        }
      }

      return ctx.prisma.operator.update({
        where: { id: input.id },
        data: {
          ...(input.data.name !== undefined && { name: input.data.name.trim() }),
          ...(input.data.rg !== undefined && { rg: input.data.rg?.trim() || null }),
          ...(input.data.cpf !== undefined && { cpf: input.data.cpf?.trim() || null }),
          ...(input.data.role !== undefined && { role: input.data.role?.trim() || null }),
          ...(input.data.phone !== undefined && { phone: input.data.phone?.trim() || null }),
          ...(input.data.notes !== undefined && { notes: input.data.notes?.trim() || null }),
        },
      });
    }),

  /** Desligou → inativa. Voltou → reativa. O histórico nunca é tocado. */
  setActive: protectedProcedure
    .input(z.object({ id: z.string().uuid(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.operator.update({
        where: { id: input.id },
        data: { active: input.active },
      });
    }),

  /**
   * Exclusão definitiva — só permitida para quem NUNCA foi vinculado a uma
   * locação ou manutenção. Quem tem histórico não é apagado: o servidor
   * recusa e manda inativar, para não destruir o registro de quais máquinas
   * a pessoa operou.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const operator = await ctx.prisma.operator.findUniqueOrThrow({
        where: { id: input.id },
        include: { _count: { select: { assignments: true, maintenances: true } } },
      });

      const vinculos = operator._count.assignments + operator._count.maintenances;
      if (vinculos > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            `${operator.name} não pode ser excluído porque já tem ${vinculos} registro(s) ` +
            `de máquinas operadas. Apagar destruiria esse histórico. ` +
            `Use "Inativar" — ele sai da lista de seleção mas o histórico continua intacto, ` +
            `e é só reativar se ele voltar.`,
        });
      }

      return ctx.prisma.operator.delete({ where: { id: input.id } });
    }),
});
