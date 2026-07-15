import { z } from "zod";
import { createTRPCRouter, protectedProcedure, superAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const projectsRouter = createTRPCRouter({
  // ─── PROJETOS ────────────────────────────────────────────

  list: protectedProcedure.query(async ({ ctx }) => {
    const role = (ctx.session.user as any).role as string;
    const clienteId = (ctx.session.user as any).clienteId as string | null;
    return ctx.prisma.project.findMany({
      where: role === "client" && clienteId ? { clientId: clienteId } : undefined,
      include: {
        client: { select: { id: true, name: true, company: true } },
        paymentSchedule: true,
        milestones: { orderBy: { sortOrder: "asc" } },
        _count: { select: { logs: true, checklists: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          client: { select: { id: true, name: true, company: true, email: true, phone: true } },
          proposal: { select: { id: true, code: true, title: true, totalValue: true } },
          milestones: { orderBy: { sortOrder: "asc" } },
          logs: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { date: "desc" },
          },
          checklists: {
            include: { items: { orderBy: { sortOrder: "asc" } } },
            orderBy: { createdAt: "asc" },
          },
          technicalDocs: { orderBy: { uploadedAt: "desc" } },
          paymentSchedule: { orderBy: { sortOrder: "asc" } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        name: z.string().min(2),
        serviceType: z.string().optional(),
        contractValue: z.number().positive(),
        startDate: z.string().optional(),
        expectedEndDate: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        notes: z.string().optional(),
        parcelas: z.array(z.object({
          description: z.string(),
          expectedValue: z.number().positive(),
          dueDate: z.string().optional(),
          sortOrder: z.number().default(0),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { parcelas, startDate, expectedEndDate, ...projectData } = input;
      const count = await ctx.prisma.project.count();
      const code = `OBR-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

      const project = await ctx.prisma.project.create({
        data: {
          ...projectData,
          code,
          status: "aguardando_inicio",
          startDate: startDate ? new Date(startDate) : undefined,
          expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : undefined,
        },
      });

      if (parcelas && parcelas.length > 0) {
        await ctx.prisma.paymentSchedule.createMany({
          data: parcelas.map((p) => ({
            description: p.description,
            expectedValue: p.expectedValue,
            receivedValue: 0,
            status: "pendente" as const,
            projectId: project.id,
            sortOrder: p.sortOrder,
            dueDate: p.dueDate ? new Date(p.dueDate) : undefined,
          })),
        });
      }

      return project;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        code: z.string().min(1).optional(),
        name: z.string().min(2).optional(),
        contractValue: z.number().positive().optional(),
        serviceType: z.string().optional().nullable(),
        startDate: z.string().optional().nullable(),
        expectedEndDate: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        folderUrl: z.string().optional().nullable(),
        proposalId: z.string().uuid().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, startDate, expectedEndDate, ...rest } = input;
      return ctx.prisma.project.update({
        where: { id },
        data: {
          ...rest,
          startDate: startDate === null ? null : startDate ? new Date(startDate) : undefined,
          expectedEndDate: expectedEndDate === null ? null : expectedEndDate ? new Date(expectedEndDate) : undefined,
        },
      });
    }),

  getProposalsForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.proposal.findMany({
      where: { status: { in: ["aprovada", "enviada", "em_negociacao"] } },
      select: { id: true, code: true, title: true, client: { select: { name: true, company: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["aguardando_inicio", "em_andamento", "pausado", "concluido", "cancelado"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.project.update({
        where: { id: input.id },
        data: {
          status: input.status,
          actualEndDate: input.status === "concluido" ? new Date() : undefined,
        },
      });
    }),

  // Exclui o projeto inteiro (marcos, diário, checklists, documentos e
  // parcelas são removidos em cascata pelo schema). Somente admin.
  delete: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        select: { id: true, code: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado." });
      }
      return ctx.prisma.project.delete({ where: { id: input.id } });
    }),

  // ─── MARCOS (MILESTONES) ─────────────────────────────────

  createMilestone: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { dueDate, ...rest } = input;
      return ctx.prisma.projectMilestone.create({
        data: { ...rest, dueDate: dueDate ? new Date(dueDate) : undefined },
      });
    }),

  toggleMilestone: protectedProcedure
    .input(z.object({ id: z.string().uuid(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectMilestone.update({
        where: { id: input.id },
        data: { completedAt: input.completed ? new Date() : null },
      });
    }),

  deleteMilestone: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectMilestone.delete({ where: { id: input.id } });
    }),

  // ─── DIÁRIO DE OBRA (LOGS) ───────────────────────────────

  createLog: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        date: z.string(),
        description: z.string().min(1),
        weather: z.string().optional(),
        workers: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { date, ...rest } = input;
      return ctx.prisma.projectLog.create({
        data: { ...rest, date: new Date(date), userId: ctx.session.user.id },
        include: { user: { select: { id: true, name: true } } },
      });
    }),

  deleteLog: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectLog.delete({ where: { id: input.id } });
    }),

  // ─── CHECKLISTS ──────────────────────────────────────────

  createChecklist: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1),
        items: z.array(z.object({
          description: z.string(),
          sortOrder: z.number().default(0),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { items, ...rest } = input;
      return ctx.prisma.projectChecklist.create({
        data: {
          ...rest,
          items: items ? { createMany: { data: items } } : undefined,
        },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
    }),

  deleteChecklist: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectChecklist.delete({ where: { id: input.id } });
    }),

  addChecklistItem: protectedProcedure
    .input(
      z.object({
        checklistId: z.string().uuid(),
        description: z.string().min(1),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.checklistItem.create({ data: input });
    }),

  toggleChecklistItem: protectedProcedure
    .input(z.object({ id: z.string().uuid(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.checklistItem.update({
        where: { id: input.id },
        data: { completed: input.completed, completedAt: input.completed ? new Date() : null },
      });
    }),

  deleteChecklistItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.checklistItem.delete({ where: { id: input.id } });
    }),
});
