import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import { MachineStatus } from "@prisma/client";

// ── schemas ───────────────────────────────────────────────────────────────────

const machineUpsertSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  plateOrCode: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  photoPath: z.string().optional(),
  status: z.nativeEnum(MachineStatus).optional(),
  notes: z.string().optional(),
});

const maintenanceUpsertSchema = z.object({
  machineId: z.string().uuid(),
  date: z.string().datetime().optional(),
  performedBy: z.string().min(1),
  description: z.string().min(1),
  cost: z.number().min(0).optional(),
  photos: z.array(z.string()).optional(),
});

const rentalUpsertSchema = z.object({
  machineId: z.string().uuid(),
  proposalId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  title: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  notes: z.string().optional(),
});

export const frotaRouter = createTRPCRouter({
  // ── MÁQUINAS ──────────────────────────────────────────────────────────────

  listMachines: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.machine.findMany({
        where: input?.includeInactive ? {} : { active: true },
        include: {
          _count: { select: { maintenances: true, rentals: true } },
          maintenances: { orderBy: { date: "desc" }, take: 1 },
        },
        orderBy: { name: "asc" },
      });
    }),

  getMachine: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.machine.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          maintenances: { orderBy: { date: "desc" } },
          rentals: {
            orderBy: { startDate: "desc" },
            include: {
              client: { select: { id: true, name: true, company: true } },
              proposal: { select: { id: true, code: true } },
            },
          },
        },
      });
    }),

  createMachine: protectedProcedure
    .input(machineUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machine.create({ data: input });
    }),

  updateMachine: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: machineUpsertSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machine.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  setMachineActive: protectedProcedure
    .input(z.object({ id: z.string().uuid(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machine.update({
        where: { id: input.id },
        data: { active: input.active },
      });
    }),

  deleteMachine: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machine.delete({ where: { id: input.id } });
    }),

  // ── MANUTENÇÕES ───────────────────────────────────────────────────────────

  createMaintenance: protectedProcedure
    .input(maintenanceUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machineMaintenance.create({
        data: {
          machineId: input.machineId,
          date: input.date ? new Date(input.date) : new Date(),
          performedBy: input.performedBy,
          description: input.description,
          cost: input.cost,
          photos: input.photos ?? [],
        },
      });
    }),

  updateMaintenance: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: maintenanceUpsertSchema.omit({ machineId: true }).partial() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machineMaintenance.update({
        where: { id: input.id },
        data: {
          ...input.data,
          ...(input.data.date && { date: new Date(input.data.date) }),
        },
      });
    }),

  deleteMaintenance: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machineMaintenance.delete({ where: { id: input.id } });
    }),

  // ── LOCAÇÕES ──────────────────────────────────────────────────────────────

  listRentals: protectedProcedure
    .input(
      z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.machineRental.findMany({
        where: {
          ...(input?.from && input?.to
            ? {
                startDate: { lte: new Date(input.to) },
                endDate: { gte: new Date(input.from) },
              }
            : {}),
        },
        include: {
          machine: { select: { id: true, name: true, category: true } },
          client: { select: { id: true, name: true, company: true } },
          proposal: { select: { id: true, code: true } },
        },
        orderBy: { startDate: "asc" },
      });
    }),

  createRental: protectedProcedure
    .input(rentalUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machineRental.create({
        data: {
          machineId: input.machineId,
          proposalId: input.proposalId,
          leadId: input.leadId,
          clientId: input.clientId,
          title: input.title,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          notes: input.notes,
        },
      });
    }),

  updateRental: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: rentalUpsertSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const { startDate, endDate, ...rest } = input.data;
      return ctx.prisma.machineRental.update({
        where: { id: input.id },
        data: {
          ...rest,
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
        },
      });
    }),

  deleteRental: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machineRental.delete({ where: { id: input.id } });
    }),

  // Propostas fechadas (aprovadas) para vincular a uma locação
  getClosedProposalsForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.proposal.findMany({
      where: { status: "aprovada" },
      select: {
        id: true,
        code: true,
        title: true,
        leadId: true,
        clientId: true,
        client: { select: { id: true, name: true, company: true } },
      },
      orderBy: { approvedAt: "desc" },
    });
  }),
});
