import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const DOC_STATUS = ["a_iniciar", "previa", "em_producao", "em_revisao", "em_conferencia", "liberado_para_obra", "finalizado", "superado"] as const;
const DOC_PRIORITY = ["baixa", "media", "alta", "urgente", "prazo_a_definir"] as const;
const DOC_TYPE = ["art", "rrt", "memorial_descritivo", "contrato", "planilha_calculo", "prancha_pdf", "link_externo", "outro"] as const;

export const docsRouter = createTRPCRouter({
  // Listagem global (Central de Documentos)
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        projectId: z.string().uuid().optional(),
        type: z.enum(DOC_TYPE).optional(),
        status: z.enum(DOC_STATUS).optional(),
        priority: z.enum(DOC_PRIORITY).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { search, projectId, type, status, priority } = input;
      const role = (ctx.session.user as any).role as string;
      const clienteId = (ctx.session.user as any).clienteId as string | null;
      const clientFilter = role === "client" && clienteId
        ? { project: { clientId: clienteId } }
        : {};
      return ctx.prisma.technicalDoc.findMany({
        where: {
          ...clientFilter,
          // Central de Documentos não exibe docs superados (ficam na pasta Superados do projeto)
          ...(status ? { status } : { NOT: { status: "superado" } }),
          ...(projectId ? { projectId } : {}),
          ...(type ? { type } : {}),
          ...(priority ? { priority } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                  { assignedTo: { contains: search, mode: "insensitive" } },
                  { project: { name: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              client: { select: { id: true, name: true, company: true } },
            },
          },
        },
        orderBy: [{ priority: "asc" }, { uploadedAt: "desc" }],
      });
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.technicalDoc.findMany({
        where: { projectId: input.projectId },
        orderBy: [{ priority: "asc" }, { uploadedAt: "desc" }],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1),
        type: z.enum(DOC_TYPE),
        description: z.string().optional(),
        linkExterno: z.string().optional().or(z.literal("")),
        storagePath: z.string().optional(),
        status: z.enum(DOC_STATUS).default("a_iniciar"),
        priority: z.enum(DOC_PRIORITY).default("media"),
        version: z.string().optional(),
        dueDate: z.string().optional(),
        assignedTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { dueDate, linkExterno, ...rest } = input;
      return ctx.prisma.technicalDoc.create({
        data: {
          ...rest,
          linkExterno: linkExterno || undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        },
      });
    }),

  // Criação em lote após upload múltiplo
  createMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        docs: z.array(z.object({
          name: z.string().min(1),
          type: z.enum(DOC_TYPE),
          storagePath: z.string().optional(),
          fileSize: z.number().optional(),
        })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.technicalDoc.createMany({
        data: input.docs.map((d) => ({
          projectId: input.projectId,
          name: d.name,
          type: d.type,
          storagePath: d.storagePath,
          fileSize: d.fileSize,
          status: "a_iniciar" as const,
          priority: "media" as const,
        })),
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        type: z.enum(DOC_TYPE).optional(),
        description: z.string().optional().nullable(),
        linkExterno: z.string().optional().nullable(),
        storagePath: z.string().optional().nullable(),
        status: z.enum(DOC_STATUS).optional(),
        priority: z.enum(DOC_PRIORITY).optional(),
        version: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
        assignedTo: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, dueDate, ...rest } = input;
      return ctx.prisma.technicalDoc.update({
        where: { id },
        data: {
          ...rest,
          dueDate: dueDate === null ? null : dueDate ? new Date(dueDate) : undefined,
        },
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(DOC_STATUS) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.technicalDoc.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.technicalDoc.delete({ where: { id: input.id } });
    }),
});
