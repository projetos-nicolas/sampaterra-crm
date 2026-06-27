import { z } from "zod";
import { createTRPCRouter, protectedProcedure, superAdminProcedure } from "../trpc";
import { LeadStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const leadsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(LeadStatus).optional(),
        clientId: z.string().uuid().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, clientId, search } = input;

      return ctx.prisma.lead.findMany({
        where: {
          ...(status && { status }),
          ...(clientId && { clientId }),
          ...(search && {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { client: { name: { contains: search, mode: "insensitive" } } },
            ],
          }),
        },
        include: {
          client: { select: { id: true, name: true, company: true } },
          _count: { select: { interactions: true } },
        },
        orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      });
    }),

  pipeline: protectedProcedure.query(async ({ ctx }) => {
    const leads = await ctx.prisma.lead.findMany({
      include: {
        client: { select: { id: true, name: true, company: true } },
        proposals: {
          select: { id: true, code: true, status: true, totalValue: true },
          orderBy: { createdAt: "desc" as const },
        },
      },
      orderBy: [{ priority: "asc" }, { estimatedValue: "desc" }],
    });

    const grouped = Object.values(LeadStatus).reduce(
      (acc, status) => {
        acc[status] = [];
        return acc;
      },
      {} as Record<LeadStatus, typeof leads>
    );

    for (const lead of leads) {
      // Unifica "perdido" com "proposta_declinada" na exibição
      const displayStatus = lead.status === "perdido" ? "proposta_declinada" : lead.status;
      if (grouped[displayStatus]) {
        grouped[displayStatus].push(lead);
      }
    }

    return grouped;
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.lead.findUnique({
        where: { id: input.id },
        include: {
          client: true,
          interactions: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { occurredAt: "desc" },
          },
          proposals: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        title: z.string().min(3),
        serviceType: z.string().optional(),
        estimatedValue: z.number().positive().optional(),
        priority: z.number().min(1).max(3).default(2),
        expectedCloseAt: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.lead.create({ data: input });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.nativeEnum(LeadStatus),
        lostReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status, lostReason } = input;
      return ctx.prisma.lead.update({
        where: { id },
        data: { status, lostReason },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(3).optional(),
        serviceType: z.string().optional().nullable(),
        estimatedValue: z.number().positive().optional().nullable(),
        priority: z.number().min(1).max(3).optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.lead.update({ where: { id }, data });
    }),

  addInteraction: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        type: z.string(),
        description: z.string().min(3),
        nextAction: z.string().optional(),
        nextActionAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user.id as string;
      return ctx.prisma.interaction.create({
        data: { ...input, userId },
      });
    }),

  // Exclui o lead e tudo relacionado a ele (propostas, itens, interações),
  // mas NUNCA o cliente. Bloqueia se alguma proposta já gerou um projeto.
  delete: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.prisma.lead.findUnique({
        where: { id: input.id },
        include: {
          proposals: {
            select: {
              id: true,
              code: true,
              project: { select: { id: true, code: true } },
            },
          },
        },
      });

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado." });
      }

      const proposalWithProject = lead.proposals.find((p) => p.project);
      if (proposalWithProject) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A proposta ${proposalWithProject.code} já gerou o projeto ${proposalWithProject.project!.code}. Remova ou desvincule o projeto antes de excluir o lead.`,
        });
      }

      // Apaga propostas (itens são removidos em cascata), depois o lead
      // (interações são removidas em cascata). O cliente nunca é tocado.
      return ctx.prisma.$transaction(async (tx) => {
        await tx.proposal.deleteMany({ where: { leadId: input.id } });
        await tx.lead.delete({ where: { id: input.id } });
        return { success: true };
      });
    }),
});
