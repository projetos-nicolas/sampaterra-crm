import { z } from "zod";
import { createTRPCRouter, protectedProcedure, superAdminProcedure } from "../trpc";
import { ProposalStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ── helpers ──────────────────────────────────────────────────────────────────

async function generateCode(prisma: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PROP-${year}-`;
  const last = await prisma.proposal.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const seq = last ? parseInt(last.code.split("-")[2]) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

// ── schemas ───────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  id: z.string().uuid().optional(), // presente em updates
  description: z.string().min(1),
  unit: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  sortOrder: z.number().int().default(0),
});

const proposalUpsertSchema = z.object({
  leadId: z.string().uuid(),
  clientId: z.string().uuid(),
  title: z.string().min(1),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

// ── router ────────────────────────────────────────────────────────────────────

export const proposalsRouter = createTRPCRouter({
  // Lista todas as propostas com filtros
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ProposalStatus).optional(),
        clientId: z.string().uuid().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role as string;
      const clienteId = (ctx.session.user as any).clienteId as string | null;
      const clientFilter = role === "client" && clienteId ? { clientId: clienteId } : {};
      return ctx.prisma.proposal.findMany({
        where: {
          ...clientFilter,
          ...(input.status && { status: input.status }),
          ...(input.clientId && { clientId: input.clientId }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: "insensitive" } },
              { code: { contains: input.search, mode: "insensitive" } },
              {
                client: {
                  name: { contains: input.search, mode: "insensitive" },
                },
              },
            ],
          }),
        },
        include: {
          client: { select: { id: true, name: true, company: true } },
          lead: { select: { id: true, title: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Busca proposta por ID com todos os itens
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.proposal.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          client: { select: { id: true, name: true, company: true } },
          lead: { select: { id: true, title: true } },
          items: { orderBy: { sortOrder: "asc" } },
        },
      });
    }),

  // Busca proposta por ID com dados completos do cliente (para geração de PDF)
  getByIdForPdf: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.proposal.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true,
              cpf_cnpj: true,
              phone: true,
              email: true,
              address: true,
              addressNumber: true,
              complement: true,
              cep: true,
              city: true,
              state: true,
              contacts: {
                select: { id: true, name: true, role: true, email: true, phone: true, isPrimary: true },
                orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
              },
            },
          },
          lead: { select: { id: true, title: true } },
          items: { orderBy: { sortOrder: "asc" } },
        },
      });
    }),

  // Cria nova proposta
  create: protectedProcedure
    .input(proposalUpsertSchema.extend({ code: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const code = input.code?.trim() || (await generateCode(ctx.prisma));
      const totalValue = input.items.reduce((s, i) => s + i.totalPrice, 0);

      return ctx.prisma.proposal.create({
        data: {
          code,
          leadId: input.leadId,
          clientId: input.clientId,
          title: input.title,
          totalValue,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              sortOrder: item.sortOrder,
            })),
          },
        },
        include: { items: true },
      });
    }),

  // Atualiza proposta (somente rascunho)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: proposalUpsertSchema.extend({ code: z.string().optional() }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const totalValue = input.data.items.reduce(
        (s, i) => s + i.totalPrice,
        0
      );

      // Deleta os itens antigos e recria — mais simples do que diff
      await ctx.prisma.proposalItem.deleteMany({
        where: { proposalId: input.id },
      });

      return ctx.prisma.proposal.update({
        where: { id: input.id },
        data: {
          ...(input.data.code?.trim() && { code: input.data.code.trim() }),
          leadId: input.data.leadId,
          clientId: input.data.clientId,
          title: input.data.title,
          totalValue,
          validUntil: input.data.validUntil
            ? new Date(input.data.validUntil)
            : null,
          notes: input.data.notes,
          items: {
            create: input.data.items.map((item) => ({
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              sortOrder: item.sortOrder,
            })),
          },
        },
        include: { items: true },
      });
    }),

  // Atualiza apenas o código
  patchCode: protectedProcedure
    .input(z.object({ id: z.string().uuid(), code: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.proposal.update({
        where: { id: input.id },
        data: { code: input.code.trim() },
      });
    }),

  // Atualiza status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.nativeEnum(ProposalStatus),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.proposal.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "aprovada" && { approvedAt: new Date() }),
          ...(input.status === "recusada" && {
            rejectedAt: new Date(),
            rejectionReason: input.rejectionReason,
          }),
        },
      });
    }),

  // Retorna o próximo código sugerido
  nextCode: protectedProcedure.query(async ({ ctx }) => {
    return generateCode(ctx.prisma);
  }),

  // Busca leads com cliente para o formulário
  getLeadsForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.lead.findMany({
      where: {
        status: {
          notIn: ["proposta_declinada"],
        },
      },
      select: {
        id: true,
        title: true,
        clientId: true,
        client: { select: { id: true, name: true, company: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  // Busca templates de escopo para adicionar itens rapidamente
  getScopeTemplates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.scopeTemplate.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }),

  // Exclui proposta (itens são removidos em cascata) — somente admin
  delete: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { proposalId: input.id },
        select: { id: true, code: true },
      });
      if (project) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Esta proposta já gerou o projeto ${project.code}. Remova ou desvincule o projeto antes de excluir a proposta.`,
        });
      }
      return ctx.prisma.proposal.delete({ where: { id: input.id } });
    }),

  // Contagem por status (para os badges dos tabs)
  statusCounts: protectedProcedure.query(async ({ ctx }) => {
    const role = (ctx.session.user as any).role as string;
    const clienteId = (ctx.session.user as any).clienteId as string | null;
    const clientFilter = role === 'client' && clienteId ? { clientId: clienteId } : {};
    const rows = await ctx.prisma.proposal.groupBy({
      by: ['status'],
      where: clientFilter,
      _count: { _all: true },
    });
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row._count._all;
    }
    return result;
  }),
});
