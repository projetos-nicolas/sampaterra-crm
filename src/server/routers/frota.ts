import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import { MachineStatus, OperatorRole } from "@prisma/client";
import {
  attachDerivedStatus,
  findConflicts,
  daysBetween,
} from "../utils/machineAvailability";

// ── schemas ───────────────────────────────────────────────────────────────────

const machineUpsertSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  plateOrCode: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  photoPath: z.string().optional(),
  notes: z.string().optional(),
  // `status` NAO entra mais aqui: e derivado das locacoes/manutencoes.
  // Para tirar de operacao use setMachineActive.
});

const maintenanceUpsertSchema = z.object({
  machineId: z.string().uuid(),
  date: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  immobilizes: z.boolean().optional(),
  performedBy: z.string().min(1),
  operador: z.string().optional(),
  operatorId: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  cost: z.number().min(0).optional(),
  photos: z.array(z.string()).optional(),
});

/** Um operador (ou ajudante) alocado na locação, com período próprio. */
const rentalOperatorSchema = z.object({
  operatorId: z.string().uuid(),
  role: z.nativeEnum(OperatorRole).default("operador"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const rentalUpsertSchema = z.object({
  machineId: z.string().uuid(),
  proposalId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  title: z.string().min(1),
  operador: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  notes: z.string().optional(),
  operators: z.array(rentalOperatorSchema).optional(),
});

const preventiveUpsertSchema = z.object({
  machineId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  requestedBy: z.string().optional(),
  photoPath: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  intervalDays: z.number().int().positive().optional().nullable(),
  done: z.boolean().optional(),
});

export const frotaRouter = createTRPCRouter({
  // ── MÁQUINAS ──────────────────────────────────────────────────────────────

  listMachines: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const machines = await ctx.prisma.machine.findMany({
        where: input?.includeInactive ? {} : { active: true },
        include: {
          _count: { select: { maintenances: true, rentals: true } },
          // Última manutenção registrada (para o rodapé do card)
          maintenances: { orderBy: { date: "desc" }, take: 5 },
          // Locações que cobrem hoje — usadas para derivar o status
          rentals: {
            where: { startDate: { lte: now }, endDate: { gte: now } },
            include: {
              client: { select: { id: true, name: true, company: true } },
              operators: {
                include: { operator: { select: { id: true, name: true, role: true } } },
                orderBy: { startDate: "asc" },
              },
            },
            orderBy: { startDate: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });

      // O status NÃO vem do banco: é calculado a partir do que ocupa a máquina
      // hoje. Registrar locação ou manutenção já reflete aqui automaticamente.
      return machines.map((m) => {
        const withStatus = attachDerivedStatus(m, now);
        const manutencaoAtiva = m.maintenances.find(
          (mt) =>
            mt.immobilizes &&
            mt.date.getTime() <= now.getTime() &&
            (mt.endDate == null || mt.endDate.getTime() >= now.getTime())
        );
        return {
          ...withStatus,
          // A manutenção que está imobilizando a máquina agora, se houver
          manutencaoAtiva: manutencaoAtiva ?? null,
          ultimaManutencao: m.maintenances[0] ?? null,
        };
      });
    }),

  getMachine: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const machine = await ctx.prisma.machine.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          maintenances: {
            orderBy: { date: "desc" },
            include: { operator: { select: { id: true, name: true } } },
          },
          rentals: {
            orderBy: { startDate: "desc" },
            include: {
              client: { select: { id: true, name: true, company: true } },
              proposal: { select: { id: true, code: true } },
              operators: {
                include: { operator: { select: { id: true, name: true, role: true, active: true } } },
                orderBy: { startDate: "asc" },
              },
            },
          },
        },
      });

      const withStatus = attachDerivedStatus(machine, now);

      // Cada locação já vem com os dias calculados por pessoa
      const rentals = machine.rentals.map((r) => ({
        ...r,
        operators: r.operators.map((ro) => ({
          ...ro,
          dias: daysBetween(ro.startDate, ro.endDate),
        })),
      }));

      return { ...withStatus, rentals };
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
      const maintenanceDate = input.date ? new Date(input.date) : new Date();

      const maintenanceEnd = input.endDate ? new Date(input.endDate) : null;

      const maintenance = await ctx.prisma.machineMaintenance.create({
        data: {
          machineId: input.machineId,
          date: maintenanceDate,
          endDate: maintenanceEnd,
          immobilizes: input.immobilizes ?? false,
          performedBy: input.performedBy,
          operador: input.operador,
          operatorId: input.operatorId ?? null,
          description: input.description,
          cost: input.cost,
          photos: input.photos ?? [],
        },
        include: { machine: { select: { name: true } } },
      });

      // Se houver custo, cria automaticamente um gasto mensal do escritório
      if (input.cost != null && input.cost > 0) {
        const machineName = (maintenance as any).machine?.name ?? "Máquina";
        await ctx.prisma.officeExpense.create({
          data: {
            description: `Manutenção — ${machineName} — ${input.description}`,
            category: "manutencao",
            value: input.cost,
            referenceDate: maintenanceDate,
          },
        });
      }

      // Se a manutencao imobiliza a maquina, avisa sobre locacoes que caem no
      // mesmo periodo — nao bloqueia, so devolve o alerta para a tela mostrar.
      const conflitos = (input.immobilizes ?? false)
        ? await findConflicts(ctx.prisma as any, {
            machineId: input.machineId,
            startDate: maintenanceDate,
            endDate: maintenanceEnd,
            ignoreMaintenanceId: maintenance.id,
          })
        : [];

      return { ...maintenance, conflitos: conflitos.filter((c) => c.kind === "locacao") };
    }),

  updateMaintenance: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: maintenanceUpsertSchema.omit({ machineId: true }).partial() }))
    .mutation(async ({ ctx, input }) => {
      const { date, endDate, ...rest } = input.data;
      return ctx.prisma.machineMaintenance.update({
        where: { id: input.id },
        data: {
          ...rest,
          ...(date && { date: new Date(date) }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
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
      const rentals = await ctx.prisma.machineRental.findMany({
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
          operators: {
            include: { operator: { select: { id: true, name: true, role: true, active: true } } },
            orderBy: { startDate: "asc" },
          },
        },
        orderBy: { startDate: "asc" },
      });

      // Marca as locacoes que colidem com outra locacao da MESMA maquina, para
      // a tela poder destacar o conflito mesmo depois de salvo.
      const porMaquina = new Map<string, typeof rentals>();
      for (const r of rentals) {
        const arr = porMaquina.get(r.machineId) ?? [];
        arr.push(r);
        porMaquina.set(r.machineId, arr);
      }

      return rentals.map((r) => {
        const irmas = porMaquina.get(r.machineId) ?? [];
        const colide = irmas.filter(
          (o) =>
            o.id !== r.id &&
            o.startDate.getTime() <= r.endDate.getTime() &&
            o.endDate.getTime() >= r.startDate.getTime()
        );
        return {
          ...r,
          operators: r.operators.map((ro) => ({
            ...ro,
            dias: daysBetween(ro.startDate, ro.endDate),
          })),
          conflitaCom: colide.map((o) => ({
            id: o.id,
            title: o.title,
            startDate: o.startDate,
            endDate: o.endDate,
          })),
        };
      });
    }),

  /**
   * Checagem sob demanda usada pelo modal de locacao: dado maquina + periodo,
   * devolve tudo que ja ocupa esse equipamento. Roda enquanto o usuario
   * preenche as datas, antes de salvar.
   */
  checkAvailability: protectedProcedure
    .input(
      z.object({
        machineId: z.string().uuid(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime().optional().nullable(),
        ignoreRentalId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conflitos = await findConflicts(ctx.prisma as any, {
        machineId: input.machineId,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        ignoreRentalId: input.ignoreRentalId,
      });
      return {
        livre: conflitos.length === 0,
        conflitos,
        temManutencao: conflitos.some((c) => c.kind === "manutencao"),
        temLocacao: conflitos.some((c) => c.kind === "locacao"),
      };
    }),

  createRental: protectedProcedure
    .input(rentalUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      // Avisa (nao bloqueia): a decisao final e do usuario, mas ele precisa
      // ver com o que esta colidindo antes de confirmar.
      const conflitos = await findConflicts(ctx.prisma as any, {
        machineId: input.machineId,
        startDate: start,
        endDate: end,
      });

      const rental = await ctx.prisma.machineRental.create({
        data: {
          machineId: input.machineId,
          proposalId: input.proposalId,
          leadId: input.leadId,
          clientId: input.clientId,
          title: input.title,
          operador: input.operador,
          location: input.location,
          startDate: start,
          endDate: end,
          notes: input.notes,
          ...(input.operators?.length
            ? {
                operators: {
                  create: input.operators.map((o) => ({
                    operatorId: o.operatorId,
                    role: o.role,
                    startDate: new Date(o.startDate),
                    endDate: o.endDate ? new Date(o.endDate) : null,
                    notes: o.notes ?? null,
                  })),
                },
              }
            : {}),
        },
        include: {
          operators: { include: { operator: { select: { id: true, name: true } } } },
        },
      });

      return { ...rental, conflitos };
    }),

  updateRental: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: rentalUpsertSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const { startDate, endDate, operators, ...rest } = input.data;

      const atual = await ctx.prisma.machineRental.findUniqueOrThrow({
        where: { id: input.id },
        select: { machineId: true, startDate: true, endDate: true },
      });

      const novoInicio = startDate ? new Date(startDate) : atual.startDate;
      const novoFim = endDate ? new Date(endDate) : atual.endDate;

      const conflitos = await findConflicts(ctx.prisma as any, {
        machineId: rest.machineId ?? atual.machineId,
        startDate: novoInicio,
        endDate: novoFim,
        ignoreRentalId: input.id,
      });

      // A lista de operadores e substituida por inteiro quando enviada:
      // o modal manda sempre o estado completo da alocacao.
      const rental = await ctx.prisma.$transaction(async (tx) => {
        if (operators !== undefined) {
          await tx.rentalOperator.deleteMany({ where: { rentalId: input.id } });
        }
        return tx.machineRental.update({
          where: { id: input.id },
          data: {
            ...rest,
            ...(startDate && { startDate: novoInicio }),
            ...(endDate && { endDate: novoFim }),
            ...(operators?.length
              ? {
                  operators: {
                    create: operators.map((o) => ({
                      operatorId: o.operatorId,
                      role: o.role,
                      startDate: new Date(o.startDate),
                      endDate: o.endDate ? new Date(o.endDate) : null,
                      notes: o.notes ?? null,
                    })),
                  },
                }
              : {}),
          },
          include: {
            operators: { include: { operator: { select: { id: true, name: true } } } },
          },
        });
      });

      return { ...rental, conflitos };
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

  // ── MANUTENÇÕES PREVENTIVAS ───────────────────────────────────────────────

  listPreventiveMaintenances: protectedProcedure
    .input(z.object({ machineId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.machinePreventiveMaintenance.findMany({
        where: { machineId: input.machineId },
        orderBy: [{ done: "asc" }, { dueDate: "asc" }],
      });
    }),

  createPreventiveMaintenance: protectedProcedure
    .input(preventiveUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machinePreventiveMaintenance.create({
        data: {
          machineId: input.machineId,
          title: input.title,
          description: input.description,
          requestedBy: input.requestedBy,
          photoPath: input.photoPath ?? null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          intervalDays: input.intervalDays ?? null,
          done: input.done ?? false,
        },
      });
    }),

  updatePreventiveMaintenance: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: preventiveUpsertSchema.omit({ machineId: true }).partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { dueDate, done, ...rest } = input.data;
      return ctx.prisma.machinePreventiveMaintenance.update({
        where: { id: input.id },
        data: {
          ...rest,
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(done !== undefined && {
            done,
            doneAt: done ? new Date() : null,
          }),
        },
      });
    }),

  deletePreventiveMaintenance: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.machinePreventiveMaintenance.delete({ where: { id: input.id } });
    }),
});
