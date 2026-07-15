import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../trpc";

export const requestsRouter = createTRPCRouter({
  // ── Público: enviar solicitação de cadastro ────────────────
  create: publicProcedure
    .input(
      z.object({
        email:    z.string().email(),
        type:     z.enum(["PF", "PJ"]),
        name:     z.string().min(2),
        company:  z.string().optional(),
        cpf_cnpj: z.string().optional(),
        phone:    z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verifica e-mail já cadastrado como usuário
      const existingUser = await ctx.prisma.user.findUnique({ where: { email: input.email } });
      if (existingUser) throw new Error("E-mail já possui acesso ao sistema.");

      // Verifica solicitação pendente
      const existing = await ctx.prisma.clientRequest.findFirst({
        where: { email: input.email, status: "pending" },
      });
      if (existing) throw new Error("Já existe uma solicitação pendente para este e-mail.");

      return ctx.prisma.clientRequest.create({ data: input });
    }),

  // ── Admin: listar solicitações ─────────────────────────────
  list: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.clientRequest.findMany({
        where: input?.status ? { status: input.status } : undefined,
        orderBy: { createdAt: "desc" },
      });
    }),

  // ── Admin: contar pendentes (para badge) ───────────────────
  countPending: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.clientRequest.count({ where: { status: "pending" } });
  }),

  // ── Admin: aprovar — cria Client + User portal ─────────────
  approve: adminProcedure
    .input(
      z.object({
        id:              z.string().uuid(),
        initialPassword: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.clientRequest.findUniqueOrThrow({ where: { id: input.id } });

      // Cria Client
      const client = await ctx.prisma.client.create({
        data: {
          type:      req.type,
          name:      req.name,
          company:   req.company ?? undefined,
          cpf_cnpj:  req.cpf_cnpj ?? undefined,
          email:     req.email,
          phone:     req.phone ?? undefined,
          active:    true,
        },
      });

      // Cria User vinculado ao cliente
      const hash = await bcrypt.hash(input.initialPassword, 12);
      await ctx.prisma.user.create({
        data: {
          name:       req.type === "PJ" ? (req.company ?? req.name) : req.name,
          email:      req.email,
          password:   hash,
          role:       "client",
          cliente_id: client.id,
          active:     true,
        },
      });

      // Atualiza status da solicitação
      return ctx.prisma.clientRequest.update({
        where: { id: input.id },
        data:  { status: "approved" },
      });
    }),

  // ── Admin: rejeitar ────────────────────────────────────────
  reject: adminProcedure
    .input(z.object({ id: z.string().uuid(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clientRequest.update({
        where: { id: input.id },
        data:  { status: "rejected", notes: input.notes ?? null },
      });
    }),
});
