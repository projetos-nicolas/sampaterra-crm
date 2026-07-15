import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";

const INTERNAL_ROLES = ["admin", "coordinator", "engineer", "funcionario"] as const;

export const usersRouter = createTRPCRouter({
  // ── Portal (clientes) ────────────────────────────────────────────────────────

  getPortalUser: adminProcedure
    .input(z.object({ clienteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findFirst({
        where: { cliente_id: input.clienteId, role: "client" },
        select: { id: true, name: true, email: true, active: true, createdAt: true },
      });
    }),

  createPortalUser: adminProcedure
    .input(z.object({
      clienteId: z.string().uuid(),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.prisma.user.findUnique({ where: { email: input.email } });
      if (exists) throw new Error("E-mail já cadastrado.");
      const hash = await bcrypt.hash(input.password, 10);
      return ctx.prisma.user.create({
        data: { name: input.name, email: input.email, password: hash, role: "client", cliente_id: input.clienteId, active: true },
        select: { id: true, name: true, email: true, active: true },
      });
    }),

  togglePortalAccess: adminProcedure
    .input(z.object({ userId: z.string().uuid(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { active: input.active },
        select: { id: true, active: true },
      });
    }),

  resetPassword: adminProcedure
    .input(z.object({ userId: z.string().uuid(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const hash = await bcrypt.hash(input.newPassword, 10);
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { password: hash },
        select: { id: true },
      });
    }),

  myClient: protectedProcedure.query(async ({ ctx }) => {
    const clienteId = (ctx.session.user as any).clienteId as string | null;
    if (!clienteId) return null;
    return ctx.prisma.client.findUnique({
      where: { id: clienteId },
      select: { id: true, name: true, company: true, email: true, phone: true },
    });
  }),

  // ── Usuários Internos (equipe) ───────────────────────────────────────────────

  listInternal: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { role: { in: [...INTERNAL_ROLES] } },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  }),

  createInternal: adminProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(INTERNAL_ROLES),
    }))
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.prisma.user.findUnique({ where: { email: input.email } });
      if (exists) throw new Error("E-mail já cadastrado.");
      const hash = await bcrypt.hash(input.password, 10);
      return ctx.prisma.user.create({
        data: { name: input.name, email: input.email, password: hash, role: input.role, active: true },
        select: { id: true, name: true, email: true, role: true, active: true },
      });
    }),

  updateInternal: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(2).optional(),
      role: z.enum(INTERNAL_ROLES).optional(),
      active: z.boolean().optional(),
      newPassword: z.string().min(6).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, newPassword, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (newPassword) data.password = await bcrypt.hash(newPassword, 10);
      return ctx.prisma.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true, active: true },
      });
    }),

  deleteInternal: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.delete({ where: { id: input.id } });
    }),
});
