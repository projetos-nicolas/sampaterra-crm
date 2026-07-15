import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { PaymentStatus } from "@prisma/client";

export const financeiroRouter = createTRPCRouter({
  // Parcelas de um projeto específico
  byProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.paymentSchedule.findMany({
        where: { projectId: input.projectId },
        orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }],
      });
    }),

  // Visão mensal para fechamento anual
  anoFechamento: protectedProcedure
    .input(z.object({ year: z.number().int().min(2020).max(2040) }))
    .query(async ({ ctx, input }) => {
      const start = new Date(input.year, 0, 1);
      const end = new Date(input.year, 11, 31, 23, 59, 59);

      // Busca parcelas com vencimento OU pagamento no ano
      const parcelas = await ctx.prisma.paymentSchedule.findMany({
        where: {
          OR: [
            { dueDate: { gte: start, lte: end } },
            { paidAt: { gte: start, lte: end } },
          ],
        },
        include: {
          project: {
            select: { id: true, code: true, name: true, client: { select: { name: true } } },
          },
        },
      });

      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        previsto: 0,   // agrupado por dueDate
        recebido: 0,   // agrupado por paidAt real
        aReceber: 0,   // parcelas NÃO pagas com vencimento neste mês
        parcelas: [] as typeof parcelas,
      }));

      for (const p of parcelas) {
        // PREVISTO: mês do vencimento
        if (p.dueDate) {
          const d = new Date(p.dueDate);
          if (d >= start && d <= end) {
            months[d.getMonth()].previsto += Number(p.expectedValue);
            months[d.getMonth()].parcelas.push(p);
            // A RECEBER: só conta se a parcela ainda não foi totalmente paga
            if (p.status !== "pago") {
              const pendente = Number(p.expectedValue) - Number(p.receivedValue);
              if (pendente > 0) months[d.getMonth()].aReceber += pendente;
            }
          }
        }
        // RECEBIDO: usa paidAt quando disponível, senão dueDate
        if (Number(p.receivedValue) > 0) {
          const refDate = p.paidAt ?? p.dueDate;
          if (refDate) {
            const d = new Date(refDate);
            if (d >= start && d <= end) {
              months[d.getMonth()].recebido += Number(p.receivedValue);
            }
          }
        }
      }

      const totalPrevisto = months.reduce((s, m) => s + m.previsto, 0);
      const totalRecebido = months.reduce((s, m) => s + m.recebido, 0);

      // Total contratado real = soma dos contractValue dos projetos (independente de parcelas com data)
      const projetos = await ctx.prisma.project.findMany({ select: { contractValue: true } });
      const totalContratado = projetos.reduce((s, p) => s + Number(p.contractValue), 0);

      return { months, totalPrevisto, totalRecebido, totalContratado, year: input.year };
    }),

  // Anos disponíveis (para o seletor)
  anosDisponiveis: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.paymentSchedule.findMany({
      select: { dueDate: true, paidAt: true },
      where: { OR: [{ dueDate: { not: null } }, { paidAt: { not: null } }] },
    });
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    // Adiciona ano atual + próximos 10 anos
    for (let i = 0; i <= 10; i++) yearsSet.add(currentYear + i);
    for (const r of result) {
      if (r.dueDate) yearsSet.add(new Date(r.dueDate).getFullYear());
      if (r.paidAt) yearsSet.add(new Date(r.paidAt).getFullYear());
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }),

  // Parcelas em atraso (geral)
  atrasadas: protectedProcedure.query(async ({ ctx }) => {
    const hoje = new Date();
    return ctx.prisma.paymentSchedule.findMany({
      where: {
        status: { in: ["pendente", "parcial"] },
        dueDate: { lt: hoje },
      },
      include: {
        project: {
          select: { id: true, code: true, name: true, client: { select: { name: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  }),

  // Todos os projetos com parcelas (para a view "Por Parcelas")
  todasParcelas: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.project.findMany({
      include: {
        client: { select: { id: true, name: true, company: true } },
        paymentSchedule: {
          orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Editar parcela existente (inclui receivedValue e status)
  updateParcela: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        description: z.string().min(1).optional(),
        expectedValue: z.number().positive().optional(),
        receivedValue: z.number().min(0).optional(),
        dueDate: z.date().optional().nullable(),
        paidAt: z.date().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Recalcula status automaticamente se valores foram alterados
      if (data.expectedValue !== undefined || data.receivedValue !== undefined) {
        const current = await ctx.prisma.paymentSchedule.findUnique({ where: { id } });
        const expected = data.expectedValue ?? Number(current?.expectedValue ?? 0);
        const received = data.receivedValue ?? Number(current?.receivedValue ?? 0);
        const hoje = new Date();
        const dueDate = data.dueDate !== undefined ? data.dueDate : current?.dueDate;

        let status: "pendente" | "parcial" | "pago" | "atrasado" = "pendente";
        if (received >= expected) status = "pago";
        else if (received > 0) status = "parcial";
        else if (dueDate && new Date(dueDate) < hoje) status = "atrasado";

        return ctx.prisma.paymentSchedule.update({ where: { id }, data: { ...data, status } });
      }

      return ctx.prisma.paymentSchedule.update({ where: { id }, data });
    }),

  // Atualizar status da parcela diretamente
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["pendente", "pago", "atrasado", "parcial"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: any = { status: input.status };
      if (input.status === "pago") {
        const parcela = await ctx.prisma.paymentSchedule.findUnique({ where: { id: input.id } });
        if (parcela) {
          data.receivedValue = parcela.expectedValue;
          data.paidAt = new Date();
        }
      }
      return ctx.prisma.paymentSchedule.update({ where: { id: input.id }, data });
    }),

  // Excluir parcela
  deleteParcela: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.paymentSchedule.delete({ where: { id: input.id } });
    }),

  // Criar parcela
  createParcela: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        description: z.string().min(2),
        dueDate: z.date().optional(),
        expectedValue: z.number().positive(),
        notes: z.string().optional(),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.paymentSchedule.create({ data: input });
    }),

  // Registrar pagamento (parcial ou total)
  registrarPagamento: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        valor: z.number().positive(),
        paidAt: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const parcela = await ctx.prisma.paymentSchedule.findUnique({
        where: { id: input.id },
      });
      if (!parcela) throw new Error("Parcela não encontrada");

      const novoRecebido = Number(parcela.receivedValue) + input.valor;
      const status: PaymentStatus =
        novoRecebido >= Number(parcela.expectedValue)
          ? "pago"
          : "parcial";

      return ctx.prisma.paymentSchedule.update({
        where: { id: input.id },
        data: {
          receivedValue: novoRecebido,
          status,
          paidAt: status === "pago" ? (input.paidAt ?? new Date()) : parcela.paidAt,
          notes: input.notes ?? parcela.notes,
        },
      });
    }),
});
