import { z } from "zod";
import { createTRPCRouter, protectedProcedure, superAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const clientCreateSchema = z.object({
  type: z.enum(["PF", "PJ"]).default("PF"),
  name: z.string().min(2),
  company: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  complement: z.string().optional(),
  city: z.string().optional(),
  state: z.string().default("SP"),
  notes: z.string().optional(),
});

export const clientsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { search, page, limit } = input;
      const skip = (page - 1) * limit;

      const where = search
        ? {
            active: true,
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { company: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { cpf_cnpj: { contains: search } },
            ],
          }
        : { active: true };

      const [items, total] = await Promise.all([
        ctx.prisma.client.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: { leads: true, projects: true },
            },
          },
        }),
        ctx.prisma.client.count({ where }),
      ]);

      return { items, total, page, limit };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
        include: {
          contacts: true,
          leads: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          projects: {
            include: {
              paymentSchedule: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!client) throw new Error("Cliente não encontrado");
      return client;
    }),

  create: protectedProcedure
    .input(clientCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.client.create({ data: input });
    }),

  update: protectedProcedure
    .input(clientCreateSchema.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.client.update({ where: { id }, data });
    }),

  // Vincula (ou atualiza/remove) os dados de uma empresa ao cliente PF já
  // cadastrado, sem criar um novo registro — preserva todo o histórico de
  // leads, propostas e projetos já associados a este cliente.
  linkCompany: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        linkedCompanyName: z.string().min(2).optional().nullable(),
        linkedCompanyCnpj: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.client.update({ where: { id }, data });
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.client.update({
        where: { id: input.id },
        data: { active: false },
      });
    }),

  // ── CONTATOS ─────────────────────────────────────────────────────────────────

  createContact: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        name: z.string().min(1),
        role: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Se isPrimary, remove flag de outros contatos do mesmo cliente
      if (input.isPrimary) {
        await ctx.prisma.contact.updateMany({
          where: { clientId: input.clientId },
          data: { isPrimary: false },
        });
      }
      return ctx.prisma.contact.create({
        data: {
          clientId: input.clientId,
          name: input.name,
          role: input.role || undefined,
          email: input.email || undefined,
          phone: input.phone || undefined,
          isPrimary: input.isPrimary ?? false,
        },
      });
    }),

  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        clientId: z.string().uuid(),
        name: z.string().min(1).optional(),
        role: z.string().optional().nullable(),
        email: z.string().email().optional().or(z.literal("")).nullable(),
        phone: z.string().optional().nullable(),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, clientId, ...data } = input;
      if (data.isPrimary) {
        await ctx.prisma.contact.updateMany({
          where: { clientId, NOT: { id } },
          data: { isPrimary: false },
        });
      }
      return ctx.prisma.contact.update({ where: { id }, data });
    }),

  deleteContact: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contact.delete({ where: { id: input.id } });
    }),

  // Exclui o cliente definitivamente. Bloqueia se houver leads, propostas ou
  // projetos vinculados — o admin precisa removê-los primeiro (use as
  // exclusões de lead/proposta/projeto). Contatos e arquivos são removidos
  // em cascata pelo schema. Somente admin.
  delete: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          _count: { select: { leads: true, proposals: true, projects: true } },
        },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      }

      const { leads, proposals, projects } = client._count;
      if (leads > 0 || proposals > 0 || projects > 0) {
        const partes = [];
        if (leads > 0) partes.push(`${leads} lead(s)`);
        if (proposals > 0) partes.push(`${proposals} proposta(s)`);
        if (projects > 0) partes.push(`${projects} projeto(s)`);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Este cliente possui ${partes.join(", ")} vinculado(s). Remova-os antes de excluir o cliente.`,
        });
      }

      await ctx.prisma.client.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
