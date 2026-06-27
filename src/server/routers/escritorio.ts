import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const ExpenseCategoryEnum = z.enum([
  "salario",
  "contas",
  "manutencao",
  "bonificacao",
  "equipamento",
  "outros",
]);

export const escritorioRouter = createTRPCRouter({
  // Lista gastos por ano (e opcionalmente mês)
  list: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2040),
        month: z.number().int().min(1).max(12).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = input.month
        ? new Date(input.year, input.month - 1, 1)
        : new Date(input.year, 0, 1);
      const end = input.month
        ? new Date(input.year, input.month, 0, 23, 59, 59)
        : new Date(input.year, 11, 31, 23, 59, 59);

      return ctx.prisma.officeExpense.findMany({
        where: { referenceDate: { gte: start, lte: end } },
        orderBy: [{ referenceDate: "desc" }, { createdAt: "desc" }],
      });
    }),

  // Resumo mensal: ganhos (payment_schedule) vs gastos (office_expenses)
  summary: protectedProcedure
    .input(z.object({ year: z.number().int().min(2020).max(2040) }))
    .query(async ({ ctx, input }) => {
      const start = new Date(input.year, 0, 1);
      const end = new Date(input.year, 11, 31, 23, 59, 59);

      // Ganhos: parcelas recebidas no ano
      const parcelas = await ctx.prisma.paymentSchedule.findMany({
        where: {
          receivedValue: { gt: 0 },
          OR: [
            { paidAt: { gte: start, lte: end } },
            { dueDate: { gte: start, lte: end }, status: "pago" },
          ],
        },
      });

      // Gastos do escritório no ano
      const gastos = await ctx.prisma.officeExpense.findMany({
        where: { referenceDate: { gte: start, lte: end } },
      });

      // Monta array de 12 meses
      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        ganhos: 0,
        gastos: 0,
      }));

      for (const p of parcelas) {
        const refDate = p.paidAt ?? p.dueDate;
        if (!refDate) continue;
        const d = new Date(refDate);
        if (d >= start && d <= end) {
          months[d.getMonth()].ganhos += Number(p.receivedValue);
        }
      }

      for (const g of gastos) {
        const d = new Date(g.referenceDate);
        months[d.getMonth()].gastos += Number(g.value);
      }

      const totalGanhos = months.reduce((s, m) => s + m.ganhos, 0);
      const totalGastos = months.reduce((s, m) => s + m.gastos, 0);

      // Gastos por categoria no ano
      const porCategoria: Record<string, number> = {};
      for (const g of gastos) {
        porCategoria[g.category] = (porCategoria[g.category] ?? 0) + Number(g.value);
      }

      return { months, totalGanhos, totalGastos, resultado: totalGanhos - totalGastos, porCategoria };
    }),

  // Criar gasto
  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(2),
        category: ExpenseCategoryEnum,
        value: z.number().positive(),
        referenceDate: z.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.officeExpense.create({ data: input });
    }),

  // Editar gasto
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        description: z.string().min(2).optional(),
        category: ExpenseCategoryEnum.optional(),
        value: z.number().positive().optional(),
        referenceDate: z.date().optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.officeExpense.update({ where: { id }, data });
    }),

  // Excluir gasto
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.officeExpense.delete({ where: { id: input.id } });
    }),
});
